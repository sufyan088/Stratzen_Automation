const { test, expect } = require('@playwright/test');

test.describe('Summary Module - Login', () => {

    test('TC001_Login_To_Stratzen', async ({ page }) => {

        const email = 'SZ_AutoQA@stratzen.ai';
        const passwordValue = 'StratzenAutomation123';

        // Step 1: Navigate to Login Page
        await page.goto('https://demoapp.stratzen.ai/login');

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

    });

});