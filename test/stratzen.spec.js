import { test, expect } from '@playwright/test';

const getRuntimeConfig = (testInfo) => {
  const appBaseUrl = process.env.URL
    || process.env.APP_URL
    || process.env.BASE_URL
    || testInfo.project.use.baseURL;

  if (!appBaseUrl) {
    throw new Error('Set URL, APP_URL, or BASE_URL before running this test.');
  }

  return {
    buildUrl: (path) => new URL(path, appBaseUrl).toString(),
    email: process.env.STRATZEN_EMAIL || 'SZ_AutoQA@stratzen.ai',
    password: process.env.STRATZEN_PASSWORD || 'StratzenAutomation123',
  };
};

const loginWithValidCredentials = async (page, testInfo) => {
  const { buildUrl, email, password } = getRuntimeConfig(testInfo);

  // Step 1: Navigate to the login page.
  await page.setViewportSize({ width: 1600, height: 1400 });
  await page.goto(buildUrl('/login'), {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

  // Step 2: Enter the email address.
  const emailField = page.getByRole('textbox', { name: /email/i }).or(page.locator('input[type="email"]')).first();
  await expect(emailField).toBeVisible();
  await emailField.fill(email);

  // Step 3: Enter the password.
  const passwordField = page.locator('input[type="password"]').first();
  await expect(passwordField).toBeVisible();
  await passwordField.fill(password);

  // Step 4: Click the Sign In button.
  await page.getByRole('button', { name: /log\s*in|sign\s*in/i }).click();

  // Step 5: Verify the login redirect completes.
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/);
};

const logoutFromProfileMenu = async (page) => {
  // Step 1: Open the profile menu.
  await page.getByText('QA', { exact: true }).click();

  // Step 2: Click the Logout action.
  await page.getByRole('menuitem', { name: 'Logout' }).click();

  // Step 3: Verify the login page is restored.
  await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
};

test.describe('Login Module', () => {
  test.describe.configure({ timeout: 120000 });

  test('TC001_Login_PageDisplaysExpectedFormControls', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1400 });

    const { buildUrl } = getRuntimeConfig(test.info());

    // Step 1: Navigate directly to the login page.
    await test.step('Step 1: Navigate directly to login', async () => {
      await page.goto(buildUrl('/login'), {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });

      await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
    });

    // Step 2: Validate the email field is visible and editable.
    await test.step('Step 2: Validate the email field is visible and editable', async () => {
      const email = page.getByRole('textbox', { name: /email/i }).or(page.locator('input[type="email"]')).first();
      await expect(email).toBeVisible();
      await expect(email).toBeEditable();
    });

    // Step 3: Validate the password field is visible and editable.
    await test.step('Step 3: Validate the password field is visible and editable', async () => {
      const password = page.locator('input[type="password"]').first();
      await expect(password).toBeVisible();
      await expect(password).toBeEditable();
    });

    // Step 4: Validate the login action is visible and enabled.
    await test.step('Step 4: Validate the login action is visible and enabled', async () => {
      const submit = page.getByRole('button', { name: /log\s*in|sign\s*in/i });
      await expect(submit).toBeVisible();
      await expect(submit).toBeEnabled();
    });
  });

  test('TC002_Login_InvalidEmailInputRejected', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1400 });

    const { buildUrl } = getRuntimeConfig(test.info());

    // Step 1: Navigate to the login page.
    await test.step('Step 1: Navigate to login page', async () => {
      await page.goto(buildUrl('/login'), {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });
      await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
    });

    const email = page.getByRole('textbox', { name: /email/i }).or(page.locator('input[type="email"]')).first();
    const password = page.locator('input[type="password"]').first();

    // Step 2: Enter an invalid email value.
    await test.step('Step 2: Enter an invalid email value', async () => {
      await expect(email).toBeVisible();
      await email.fill('invalid-email');
    });

    // Step 3: Enter a placeholder password.
    await test.step('Step 3: Enter a placeholder password', async () => {
      await expect(password).toBeVisible();
      await password.fill('NotARealPassword123!');
    });

    // Step 4: Submit the form.
    await test.step('Step 4: Submit the form', async () => {
      const submit = page.getByRole('button', { name: /log\s*in|sign\s*in/i });
      await expect(submit).toBeVisible();
      await submit.click();
    });

    // Step 5: Verify login does not proceed and validation appears.
    await test.step('Step 5: Verify login does not proceed and validation appears', async () => {
      await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

      const validationMessage = page.getByText(/invalid email|valid email|email.+(invalid|valid)|enter.+email/i).first();
      const messageVisible = await validationMessage.isVisible().catch(() => false);
      const ariaInvalid = (await email.getAttribute('aria-invalid')) === 'true';
      const htmlInvalid = await email.evaluate((el) => {
        if (!(el instanceof HTMLInputElement)) {
          return false;
        }
        return !el.checkValidity();
      });

      expect(messageVisible || ariaInvalid || htmlInvalid).toBeTruthy();
    });
  });

  test('TC003_Login_EmptyFormSubmissionBlocked', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1400 });

    const { buildUrl } = getRuntimeConfig(test.info());

    // Step 1: Navigate to the login page.
    await test.step('Step 1: Navigate to login page', async () => {
      await page.goto(buildUrl('/login'), {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });
      await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
    });

    const email = page.getByRole('textbox', { name: /email/i }).or(page.locator('input[type="email"]')).first();
    const password = page.locator('input[type="password"]').first();

    // Step 2: Submit the form without entering credentials.
    await test.step('Step 2: Submit the form without entering credentials', async () => {
      const submit = page.getByRole('button', { name: /log\s*in|sign\s*in/i });
      await expect(submit).toBeVisible();
      await submit.click();
    });

    // Step 3: Verify required-field validation is shown.
    await test.step('Step 3: Verify required-field validation is shown', async () => {
      await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

      const validationMessage = page.getByText(/required|enter.+email|enter.+password|please fill/i).first();
      const messageVisible = await validationMessage.isVisible().catch(() => false);
      const emailInvalid = await email.evaluate((el) => {
        if (!(el instanceof HTMLInputElement)) {
          return false;
        }
        return !el.checkValidity();
      });
      const passwordInvalid = await password.evaluate((el) => {
        if (!(el instanceof HTMLInputElement)) {
          return false;
        }
        return !el.checkValidity();
      });

      expect(messageVisible || emailInvalid || passwordInvalid).toBeTruthy();
    });
  });

  test('TC004_Login_PasswordRequiredWhenEmailProvided', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1400 });

    const { buildUrl } = getRuntimeConfig(test.info());

    // Step 1: Navigate to the login page.
    await test.step('Step 1: Navigate to login page', async () => {
      await page.goto(buildUrl('/login'), {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });
      await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
    });

    const email = page.getByRole('textbox', { name: /email/i }).or(page.locator('input[type="email"]')).first();
    const password = page.locator('input[type="password"]').first();

    // Step 2: Fill only the email field.
    await test.step('Step 2: Fill only the email field', async () => {
      await expect(email).toBeVisible();
      await expect(password).toBeVisible();
      await email.fill('qa@example.com');
    });

    // Step 3: Submit with the password field left empty.
    await test.step('Step 3: Submit with the password field left empty', async () => {
      const submit = page.getByRole('button', { name: /log\s*in|sign\s*in/i });
      await expect(submit).toBeVisible();
      await submit.click();
    });

    // Step 4: Verify password-required validation appears.
    await test.step('Step 4: Verify password-required validation appears', async () => {
      await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

      const validationMessage = page.getByText(/password.+required|enter.+password|required/i).first();
      const messageVisible = await validationMessage.isVisible().catch(() => false);
      const passwordInvalid = await password.evaluate((el) => {
        if (!(el instanceof HTMLInputElement)) {
          return false;
        }
        return !el.checkValidity();
      });

      expect(messageVisible || passwordInvalid).toBeTruthy();
    });
  });

  test('TC005_Login_ValidCredentials', async ({ page }) => {
    // Step 1: Sign in with valid credentials using the shared login flow.
    await test.step('Step 1: Sign in with valid credentials', async () => {
      await loginWithValidCredentials(page, test.info());
    });

    // Step 2: Verify the authenticated Summary page loads.
    await test.step('Step 2: Verify the authenticated Summary page loads', async () => {
      await expect(page).toHaveURL(/\/summary(?:[/?#]|$)/);
    });

    // Step 3: Log out.
    await test.step('Step 3: Log out', async () => {
      await logoutFromProfileMenu(page);
    });
  });
});

test.describe('Summary Module', () => {
  test.describe.configure({ timeout: 120000 });

  test('TC006_Summary_ScreenRendersForAuthenticatedUser', async ({ page }) => {
    // Step 1: Sign in with valid credentials using the shared login flow.
    await test.step('Step 1: Sign in with valid credentials', async () => {
      await loginWithValidCredentials(page, test.info());
    });

    // Step 2: Verify the Summary screen renders expected sections.
    await test.step('Step 2: Verify the Summary screen renders expected sections', async () => {
      await expect(page).toHaveURL(/\/summary(?:[/?#]|$)/);
      await expect(page.getByRole('heading', { name: 'Your Calendar' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Market Pulse Live advisor briefing, refreshes every 3 hours.' })).toBeVisible();
    });

    // Step 3: Log out.
    await test.step('Step 3: Log out', async () => {
      await logoutFromProfileMenu(page);
    });
  });
});

test.describe('Research Module', () => {
  test.describe.configure({ timeout: 120000 });

  test('TC007_Research_WorkflowCanBeStarted', async ({ page }) => {
    // Step 1: Sign in with valid credentials using the shared login flow.
    await test.step('Step 1: Sign in with valid credentials', async () => {
      await loginWithValidCredentials(page, test.info());
    });

    // Step 2: Open the Research workflow.
    await test.step('Step 2: Open the Research workflow', async () => {
      await page.getByRole('link', { name: 'Research', exact: true }).click();
      await expect(page).toHaveURL(/\/research\?watchlist_asset=stock&screener_asset=all&tab=watchlist$/);
      await expect(page.getByRole('tab', { name: 'Watchlist', exact: true })).toBeVisible();
      await expect(page.getByRole('tab', { name: /ETFs/i })).toBeVisible();
    });

    // Step 3: Log out.
    await test.step('Step 3: Log out', async () => {
      await logoutFromProfileMenu(page);
    });
  });
});

test.describe('Preferences Module', () => {
  test.describe.configure({ timeout: 120000 });

  test('TC008_Preferences_OpenAndSave', async ({ page }) => {
    // Step 1: Sign in with valid credentials using the shared login flow.
    await test.step('Step 1: Sign in with valid credentials', async () => {
      await loginWithValidCredentials(page, test.info());
    });

    // Step 2: Open Preferences and save changes.
    await test.step('Step 2: Open Preferences and save changes', async () => {
      await page.getByText('QA', { exact: true }).click();
      await page.getByRole('menuitem', { name: 'Preferences' }).click();
      await expect(page).toHaveURL(/preferences/);
      await expect(page.getByRole('button', { name: 'Summary Page Display', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Watchlist', exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Save Preferences' }).dispatchEvent('click');
      await page.waitForLoadState('networkidle');
    });

    // Step 3: Log out.
    await test.step('Step 3: Log out', async () => {
      await logoutFromProfileMenu(page);
    });
  });
});

test.describe('Logout Module', () => {
  test.describe.configure({ timeout: 120000 });

  test('TC009_Logout_AuthenticatedUserCanLogOut', async ({ page }) => {
    // Step 1: Sign in with valid credentials using the shared login flow.
    await test.step('Step 1: Sign in with valid credentials', async () => {
      await loginWithValidCredentials(page, test.info());
    });

    // Step 2: Log out from the authenticated session.
    await test.step('Step 2: Log out from the authenticated session', async () => {
      await logoutFromProfileMenu(page);
    });
  });
});