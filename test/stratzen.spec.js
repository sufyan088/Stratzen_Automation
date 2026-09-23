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

test.describe('Login Module', () => {
  test('TC001_Login_PageDisplaysExpectedFormControls', async ({ page }) => {
    const { buildUrl } = getRuntimeConfig(test.info());

    // Step 1: Navigate directly to login.
    await page.goto(buildUrl('/login'));

    // Step 2: Confirm expected route is loaded.
    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

    // Step 3: Validate email field is present and editable.
    // Selector to verify against live UI labels if this fails.
    const email = page.getByRole('textbox', { name: /email/i }).or(page.locator('input[type="email"]')).first();
    await expect(email).toBeVisible();
    await expect(email).toBeEditable();

    // Step 4: Validate password field is present and editable.
    const password = page.locator('input[type="password"]').first();
    await expect(password).toBeVisible();
    await expect(password).toBeEditable();

    // Step 5: Validate login action is visible and available.
    // Selector to verify against live UI labels if this fails.
    const submit = page.getByRole('button', { name: /log\s*in|sign\s*in/i });
    await expect(submit).toBeVisible();
    await expect(submit).toBeEnabled();
  });

  test('TC002_Login_InvalidEmailInputRejected', async ({ page }) => {
    const { buildUrl } = getRuntimeConfig(test.info());

    // Step 1: Navigate to login page.
    await page.goto(buildUrl('/login'));
    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

    // Step 2: Enter an invalid email value.
    const email = page.getByRole('textbox', { name: /email/i }).or(page.locator('input[type="email"]')).first();
    await expect(email).toBeVisible();
    await email.fill('invalid-email');

    // Step 3: Enter a non-secret placeholder password.
    const password = page.locator('input[type="password"]').first();
    await expect(password).toBeVisible();
    await password.fill('NotARealPassword123!');

    // Step 4: Submit the form.
    const submit = page.getByRole('button', { name: /log\s*in|sign\s*in/i });
    await expect(submit).toBeVisible();
    await submit.click();

    // Step 5: Verify user is not navigated away to an authenticated route.
    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

    // Step 6: Verify at least one validation signal appears.
    // Validation message text is application-specific and may need adjustment.
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

  test('TC003_Login_EmptyFormSubmissionBlocked', async ({ page }) => {
    const { buildUrl } = getRuntimeConfig(test.info());

    // Step 1: Navigate to login page.
    await page.goto(buildUrl('/login'));
    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

    // Step 2: Confirm login action is available.
    const submit = page.getByRole('button', { name: /log\s*in|sign\s*in/i });
    await expect(submit).toBeVisible();

    // Step 3: Submit without entering credentials.
    await submit.click();

    // Step 4: Verify user remains on login route.
    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

    // Step 5: Verify at least one required-field validation signal is shown.
    const email = page.getByRole('textbox', { name: /email/i }).or(page.locator('input[type="email"]')).first();
    const password = page.locator('input[type="password"]').first();
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

  test('TC004_Login_PasswordRequiredWhenEmailProvided', async ({ page }) => {
    const { buildUrl } = getRuntimeConfig(test.info());

    // Step 1: Navigate to login page.
    await page.goto(buildUrl('/login'));
    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

    // Step 2: Fill only the email value.
    const email = page.getByRole('textbox', { name: /email/i }).or(page.locator('input[type="email"]')).first();
    const password = page.locator('input[type="password"]').first();
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await email.fill('qa@example.com');

    // Step 3: Submit with password left empty.
    const submit = page.getByRole('button', { name: /log\s*in|sign\s*in/i });
    await expect(submit).toBeVisible();
    await submit.click();

    // Step 4: Verify login does not proceed.
    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

    // Step 5: Verify password-required signal appears.
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

  test('TC005_Login_ValidCredentials', async ({ page }) => {
    const { buildUrl, email, password } = getRuntimeConfig(test.info());

    // Step 1: This scenario is intentionally skipped until live selectors
    // and post-login destination are verified in the target environment.
    test.skip(!process.env.STRATZEN_EMAIL || !process.env.STRATZEN_PASSWORD, 'Set STRATZEN_EMAIL and STRATZEN_PASSWORD in .env');

    // Step 2: Open login and confirm route.
    await page.goto(buildUrl('/login'));
    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

    // Step 3: Fill credentials from environment variables.
    await page.getByRole('textbox', { name: /email/i }).fill(email);
    await page.locator('input[type="password"]').fill(password);

    // Step 4: Submit and verify authenticated landing URL.
    await page.getByRole('button', { name: /log\s*in|sign\s*in/i }).click();
    await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/);
  });
});

test.describe('Summary Module', () => {
  test.skip('TC006_Summary_ScreenRendersForAuthenticatedUser', async () => {
    // Step 1: Placeholder for summary scenario.
    // Selectors and acceptance criteria must be verified in live UI.
  });
});

test.describe('Research Module', () => {
  test.skip('TC007_Research_WorkflowCanBeStarted', async () => {
    // Step 1: Placeholder for research scenario.
    // Selectors and acceptance criteria must be verified in live UI.
  });
});

test.describe('Preferences Module', () => {
  test.skip('TC008_Preferences_OpenAndSave', async () => {
    // Step 1: Placeholder for preferences scenario.
    // Selectors and acceptance criteria must be verified in live UI.
  });
});

test.describe('Logout Module', () => {
  test.skip('TC009_Logout_AuthenticatedUserCanLogOut', async () => {
    // Step 1: Placeholder for logout scenario.
    // Selectors and acceptance criteria must be verified in live UI.
  });
});