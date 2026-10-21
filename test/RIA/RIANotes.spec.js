import { test, expect } from '@playwright/test';

import {
  getTestData,
  installNativeDialogHandler,
  resilientLocator,
  safeClick,
  safeFill,
} from './mammothhai-playwright-helpers.js';

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

test('TC_VerifyNotesAddEditDeleteAndExpandCollapseInDetailDrawer', async ({ page }) => {
  installNativeDialogHandler(page);

  const use = test.info().project.use;
  const destinationUrlStep1 = getTestData('destination_url__step1');
  const baseUrl = process.env.URL || process.env.APP_URL || process.env.BASE_URL || use.baseURL;
  const destinationUrl = destinationUrlStep1 || `${String(baseUrl).replace(/\/+$/, '')}/login`;

  const authUsername = use.username || process.env.STRATZEN_EMAIL;
  const password = use.password || process.env.STRATZEN_PASSWORD;
  const outlookUsername = use.outlookUsername || process.env.OUTLOOK_EMAIL;
  const outlookPassword = use.outlookPassword || process.env.OUTLOOK_PASSWORD;

  const noteText = 'RIA TEST NOTE ADDED';
  const updatedNoteText = 'RIA TEST NOTE UPDATED';

  if (!destinationUrl) throw new Error('Missing destination_url__step1 / BASEURL test data.');
  if (!authUsername || !password) throw new Error('Missing username or password in project.use or environment variables.');

  // nodeId: step_1
  await test.step('Step 1: Navigate to the login page.', async () => {
    await page.goto(destinationUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15000 });
  });

  // nodeId: step_2
  await test.step('Step 2: Enter email address.', async () => {
    const emailControl = await resilientLocator(page, ['input[type="email"]'], { labelFallback: 'Email Address', role: 'textbox' });
    await safeFill(emailControl, String(authUsername));
    await expect(page.locator('input[type="email"]').first()).toHaveValue(String(authUsername));
  });

  // nodeId: step_3
  await test.step('Step 3: Enter password.', async () => {
    const passwordControl = await resilientLocator(page, ['input[type="password"]'], { labelFallback: 'Password', role: 'textbox' });
    await safeFill(passwordControl, String(password));
    await expect(page.locator('input[type="password"]').first()).toHaveValue(String(password));
  });

  // nodeId: step_4
  await test.step('Step 4: Click Sign In.', async () => {
    const signInButton = await resilientLocator(page, ['button[type="submit"]'], { labelFallback: 'Sign In', role: 'button' });
    await safeClick(signInButton, { timeout: 15000 });

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

    await expect(page).toHaveURL(/summary|rias/, { timeout: 90000 });
  });

  // nodeId: step_5
  await test.step('Step 5: Open the RIAs page.', async () => {
    await page.waitForLoadState('networkidle');
    const riasLink = page.getByRole('link', { name: 'RIAs', exact: true });
    await expect(riasLink).toBeVisible({ timeout: 15000 });
    await riasLink.click();
    await expect(page).toHaveURL(/\/rias$/);
  });

  const riasTable = page.locator('table').first();
  const dataRows = riasTable.locator('tbody tr');

  const getFirstPopulatedRow = async () => {
    const rowCount = await dataRows.count();
    for (let index = 0; index < rowCount; index += 1) {
      const row = dataRows.nth(index);
      const crd = (await row.locator('td').nth(0).textContent())?.trim() || '';
      const businessName = (await row.locator('td').nth(1).textContent())?.trim() || '';

      if (crd && businessName) {
        return { row, businessName };
      }
    }

    return null;
  };

  await expect(riasTable).toBeVisible();
  await expect(dataRows.first()).toBeVisible();
  await expect.poll(getFirstPopulatedRow).not.toBeNull();

  const selectedRow = await getFirstPopulatedRow();
  if (!selectedRow) {
    throw new Error('Expected at least one populated RIA row in the list view.');
  }

  const { row: targetRow, businessName: selectedBusinessName } = selectedRow;
  await targetRow.locator('td').nth(1).click();

  const drawer = page
    .locator('[role="dialog"], [role="complementary"], aside')
    .filter({ has: page.getByText(selectedBusinessName, { exact: false }) })
    .first();

  await expect(drawer).toBeVisible({ timeout: 15000 });

  const notesToggle = drawer.getByRole('button', { name: /notes/i }).first();
  const noteComposer = drawer.getByPlaceholder('Type your note content here...').last();
  const notesRegion = noteComposer.locator('xpath=ancestor::*[@role="region"][1]');
  const composerInputRoot = noteComposer.locator('xpath=ancestor::div[contains(@class,"MuiInputBase-root")][1]');
  const addNoteButton = drawer.getByRole('button', { name: /save \(ctrl\+enter\)/i }).last();

  const getNoteTextLocator = (text) => drawer.locator('p').filter({ hasText: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
  const getNoteRow = (text) => drawer.locator(`div:has(> p:has-text("${text.replace(/"/g, '\\"')}") )`).first();

  const deleteMatchingNotes = async (text) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const matchingNotes = getNoteTextLocator(text);
      const count = await matchingNotes.count();
      if (count === 0) {
        return;
      }

      const noteRow = getNoteRow(text);
      await noteRow.hover();
      await noteRow.locator('button.nc-delete').first().click();

      const confirmDeleteButton = page
        .getByRole('button', { name: /delete|confirm|yes/i })
        .filter({ hasNotText: /^save/i })
        .first();

      if (await confirmDeleteButton.isVisible().catch(() => false)) {
        await confirmDeleteButton.click();
      }

      await expect(matchingNotes).toHaveCount(count - 1, { timeout: 15000 });
    }
  };

  // nodeId: step_6
  await test.step('Step 6: Add, edit, delete, and collapse notes in the detail drawer.', async () => {
    await expect(notesToggle).toBeVisible();
    await expect(notesRegion).toBeVisible();
    await expect(noteComposer).toBeVisible();

    await deleteMatchingNotes(noteText);
    await deleteMatchingNotes(updatedNoteText);

    const composerClassBeforeFocus = await composerInputRoot.getAttribute('class');

    await noteComposer.click();
    await expect(noteComposer).toBeFocused();
    await expect(composerInputRoot).toHaveClass(/Mui-focused/);
    if (composerClassBeforeFocus) {
      expect(composerClassBeforeFocus.includes('Mui-focused')).toBe(false);
    }

    await noteComposer.fill(noteText);
    await expect(noteComposer).toHaveValue(noteText);
    await expect(addNoteButton).toBeEnabled();

    await addNoteButton.click();

    const addedNoteText = getNoteTextLocator(noteText).first();
    await expect(addedNoteText).toBeVisible({ timeout: 15000 });
    await expect(addedNoteText).toHaveText(noteText);
    await expect(noteComposer).toHaveValue('');

    const addedNoteRow = getNoteRow(noteText);
    await addedNoteRow.hover();
    const editButton = addedNoteRow.locator('button.nc-edit').first();
    const deleteButton = addedNoteRow.locator('button.nc-delete').first();

    await expect(editButton).toBeVisible();
    await expect(deleteButton).toBeVisible();

    await editButton.click();

    const inlineEditTextarea = drawer.locator('textarea[placeholder="Type your note content here..."]').first();
    await expect(inlineEditTextarea).toBeVisible({ timeout: 15000 });
    await expect(inlineEditTextarea).toHaveValue(noteText);
    await inlineEditTextarea.fill(updatedNoteText);
    await expect(inlineEditTextarea).toHaveValue(updatedNoteText);

    const inlineEditRow = inlineEditTextarea.locator('xpath=ancestor::div[contains(@class,"MuiStack-root")][1]');
    const confirmEditButton = inlineEditRow.locator('button').nth(1);

    await expect(confirmEditButton).toBeVisible();
    await confirmEditButton.click();

    const updatedNoteRow = getNoteRow(updatedNoteText);
    await expect(updatedNoteRow.locator('p', { hasText: updatedNoteText })).toBeVisible({ timeout: 15000 });
    await expect(getNoteTextLocator(noteText)).toHaveCount(0);

    await updatedNoteRow.hover();
    await expect(updatedNoteRow.locator('button.nc-edit').first()).toBeVisible();
    const updatedDeleteButton = updatedNoteRow.locator('button.nc-delete').first();
    await expect(updatedDeleteButton).toBeVisible();

    await updatedDeleteButton.click();

    const confirmDeleteButton = page
      .getByRole('button', { name: /delete|confirm|yes/i })
      .filter({ hasNotText: /^save/i })
      .first();

    if (await confirmDeleteButton.isVisible().catch(() => false)) {
      await confirmDeleteButton.click();
    }

    await expect(getNoteTextLocator(updatedNoteText)).toHaveCount(0, { timeout: 15000 });

    await notesToggle.click();
    await expect(notesRegion).not.toBeVisible({ timeout: 15000 });
    await expect(drawer).toBeVisible();

    await notesToggle.click();
    await expect(notesRegion).toBeVisible({ timeout: 15000 });
    await expect(noteComposer).toBeVisible();
  });

  // nodeId: step_7
  await test.step('Step 7: Logout from the application.', async () => {
    const drawerCloseButton = drawer.getByRole('button', {
      name: /close drawer|close|dismiss|x/i,
    }).first();

    if (await drawerCloseButton.isVisible().catch(() => false)) {
      await drawerCloseButton.click();
      await expect(drawer).not.toBeVisible({ timeout: 15000 });
    }

    await expect(page.getByRole('status')).toHaveCount(0, { timeout: 15000 });
    await page.getByText('QA', { exact: true }).click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/login/);
  });
});
