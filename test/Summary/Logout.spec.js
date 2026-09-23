import { test, expect } from '@playwright/test';

test.describe('Summary Module - Login', () => {
    test.describe.configure({ timeout: 120000 });

    test('TC001_Login_To_Stratzen', async ({ page }) => {
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

        // Step 1: Navigate to Login Page
        await page.goto(buildUrl('/login'));

        // Verify Login Page
        await expect(page).toHaveURL(/login/);

        // Step 2: Enter Email
        const emailField = page.locator('input[type="email"]');
        await expect(emailField).toBeVisible();
        await emailField.fill(email);

        // Step 3: Enter Password
        const passwordField = page.locator('input[type="password"]');
        await expect(passwordField).toBeVisible();
        await passwordField.fill(passwordValue);

        // Step 4: Click Sign In
        await page.getByRole('button', { name: /sign in/i }).click();

        // Step 5: Verify Redirect
        await page.waitForLoadState('networkidle');
        await expect(page).not.toHaveURL(/login/);

        await page.getByText('QA', { exact: true }).click();
        await page.getByRole('menuitem', { name: 'Logout' }).click();

    });

});