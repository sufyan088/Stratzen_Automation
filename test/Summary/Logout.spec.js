import { test, expect } from '@playwright/test';

test.describe('Summary Module - Logout', () => {
    test.describe.configure({ timeout: 120000 });

    test('TC005_Login_And_Logout_From_Stratzen', async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 1400 });

        const appBaseUrl = process.env.URL
            || process.env.APP_URL
            || process.env.BASE_URL
            || test.info().project.use.baseURL;

        if (!appBaseUrl) {
            throw new Error('Set URL, APP_URL, or BASE_URL before running this test.');
        }

        const buildUrl = (path) => new URL(path, appBaseUrl).toString();
        const email = process.env.STRATZEN_EMAIL || 'SZ_AutoQA@stratzen.ai';
        const passwordValue = process.env.STRATZEN_PASSWORD || 'StratzenAutomation123';

		// Step 1: Navigate to the login page.
        await test.step('Step 1: Navigate to Login Page', async () => {
            await page.goto(buildUrl('/login'), {
                waitUntil: 'domcontentloaded',
                timeout: 90000,
            });

            await expect(page).toHaveURL(/login/);
        });

		// Step 2: Enter the email address.
        await test.step('Step 2: Enter Email', async () => {
            const emailField = page.locator('input[type="email"]');
            await expect(emailField).toBeVisible();
            await emailField.fill(email);
        });

		// Step 3: Enter the password.
        await test.step('Step 3: Enter Password', async () => {
            const passwordField = page.locator('input[type="password"]');
            await expect(passwordField).toBeVisible();
            await passwordField.fill(passwordValue);
        });

		// Step 4: Click the Sign In button.
        await test.step('Step 4: Click Sign In', async () => {
            await page.getByRole('button', { name: /sign in/i }).click();
        });

		// Step 5: Verify the login redirect completes.
        await test.step('Step 5: Verify Redirect', async () => {
            await page.waitForLoadState('networkidle');
            await expect(page).not.toHaveURL(/login/);
        });

		// Step 6: Log out and verify the login page returns.
        await test.step('Step 6: Log out and verify the login route is restored', async () => {
            await page.getByText('QA', { exact: true }).click();
            await page.getByRole('menuitem', { name: 'Logout' }).click();
            await expect(page).toHaveURL(/login/);
        });

    });

});