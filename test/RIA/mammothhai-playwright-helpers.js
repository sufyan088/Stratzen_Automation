import { test } from '@playwright/test';

export function getTestData(key) {
  const use = test.info().project.use;
  const valueFromProject = use?.[key];

  if (typeof valueFromProject === 'string' && valueFromProject.trim()) {
    return valueFromProject;
  }

  const envKey = key.toUpperCase();
  const valueFromEnv = process.env[envKey];
  if (typeof valueFromEnv === 'string' && valueFromEnv.trim()) {
    return valueFromEnv;
  }

  return undefined;
}

export function installNativeDialogHandler(page) {
  page.on('dialog', async (dialog) => {
    await dialog.accept().catch(async () => {
      await dialog.dismiss().catch(() => {});
    });
  });
}

export async function resilientLocator(page, selectors, options = {}) {
  for (const selector of selectors) {
    const candidate = page.locator(selector).first();
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }

  if (options.labelFallback) {
    const byLabel = page.getByLabel(options.labelFallback).first();
    if (await byLabel.isVisible().catch(() => false)) {
      return byLabel;
    }
  }

  if (options.role && options.labelFallback) {
    return page.getByRole(options.role, { name: new RegExp(options.labelFallback, 'i') }).first();
  }

  return page.locator(selectors[0]).first();
}

export async function safeClick(locator, options = {}) {
  const timeout = options.timeout ?? 10000;
  await locator.waitFor({ state: 'visible', timeout });
  await locator.click({ timeout });
}

export async function safeFill(locator, value, options = {}) {
  const timeout = options.timeout ?? 10000;
  await locator.waitFor({ state: 'visible', timeout });
  await locator.fill(value, { timeout });
}

function isMicrosoftHost(urlString) {
  try {
    const url = new URL(urlString);
    return /microsoftonline\.com$/i.test(url.hostname)
      || /live\.com$/i.test(url.hostname)
      || /outlook\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function isTargetAppUrl(urlString) {
  try {
    const url = new URL(urlString);
    return /^\/(summary|rias)(\/|$)/i.test(url.pathname);
  } catch {
    return false;
  }
}

async function clickIfVisible(locator, timeout = 1500) {
  const visible = await locator.first().isVisible({ timeout }).catch(() => false);
  if (visible) {
    await locator.first().click();
    return true;
  }

  return false;
}

async function fillFirstVisible(page, selectors, value, timeout = 6000) {
  for (const selector of selectors) {
    const field = page.locator(selector).first();
    const visible = await field.isVisible({ timeout }).catch(() => false);
    if (!visible) {
      continue;
    }

    await field.fill(String(value));
    return true;
  }

  return false;
}

async function handleOutlookSsoAfterAppSignIn(page, outlookUsername, outlookPassword) {
  const deadline = Date.now() + 90000;

  while (Date.now() < deadline) {
    const currentUrl = page.url();

    if (isMicrosoftHost(currentUrl)) {
      if (!outlookUsername || !outlookPassword) {
        throw new Error('Missing outlookUsername/outlookPassword in project.use or OUTLOOK_EMAIL/OUTLOOK_PASSWORD variables.');
      }

      await clickIfVisible(page.getByRole('button', { name: /use another account/i }), 1000);

      const emailEntered = await fillFirstVisible(
        page,
        ['input[name="loginfmt"]', 'input[placeholder="Email, phone, or Skype"]'],
        outlookUsername,
        5000,
      );

      if (emailEntered) {
        await clickIfVisible(page.getByRole('button', { name: /next|sign in/i }), 3000);
        await clickIfVisible(page.locator('#idSIButton9'), 3000);
      }

      const passwordEntered = await fillFirstVisible(page, ['input[name="passwd"]'], outlookPassword, 10000);
      if (passwordEntered) {
        await clickIfVisible(page.getByRole('button', { name: /sign in|log in|next/i }), 3000);
        await clickIfVisible(page.locator('#idSIButton9'), 3000);
      }

      await clickIfVisible(page.locator('#KmsiCheckboxField'), 2000);
      await clickIfVisible(page.locator('input[name="DontShowAgain"]'), 2000);
      await clickIfVisible(page.getByRole('checkbox', { name: /don'?t show this again/i }), 2000);
      await clickIfVisible(page.getByRole('button', { name: /^yes$/i }), 3000);
      await clickIfVisible(page.locator('#idSIButton9'), 3000);

      await page.waitForLoadState('domcontentloaded').catch(() => {});
      continue;
    }

    if (isTargetAppUrl(currentUrl)) {
      return;
    }

    await page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  throw new Error(`Outlook SSO did not complete within timeout. Current URL: ${page.url()}`);
}

export async function completeSignInWithOptionalOutlookSso(page, outlookUsername, outlookPassword) {
  const redirectedToMicrosoft = await page
    .waitForURL(/microsoftonline\.com|live\.com|outlook\.com/i, { timeout: 20000 })
    .then(() => true)
    .catch(() => false);

  if (redirectedToMicrosoft) {
    await handleOutlookSsoAfterAppSignIn(page, outlookUsername, outlookPassword);
  }

  const reachedAuthenticatedApp = await page
    .waitForURL(/\/(summary|rias)(\/|$)/i, { timeout: 40000 })
    .then(() => true)
    .catch(() => false);

  if (!reachedAuthenticatedApp) {
    const alertText = await page
      .locator('[role="alert"], .Mui-error, .error, .alert')
      .first()
      .textContent()
      .catch(() => null);

    throw new Error(
      `Sign in did not reach Microsoft SSO or authenticated app routes. Current URL: ${page.url()}. Visible error: ${(alertText || 'none').trim()}`,
    );
  }
}
