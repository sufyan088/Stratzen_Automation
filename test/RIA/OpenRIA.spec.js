const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Open RIAs List View', () => {
    test('TC_VerifyUserCanLoginAndNavigateToRiasListView', async ({ page }) => {
        test.setTimeout(90000);

        const email = 'SZ_AutoQA@stratzen.ai';
        const passwordValue = 'StratzenAutomation123';

        await page.goto('https://demoapp.stratzen.ai/login');
        await expect(page).toHaveURL(/login/);

        const emailField = page.locator('input[type="email"]');
        await expect(emailField).toBeVisible();
        await emailField.fill(email);

        const passwordField = page.locator('input[type="password"]');
        await expect(passwordField).toBeVisible();
        await passwordField.fill(passwordValue);

        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForURL('https://demoapp.stratzen.ai/summary');
        await expect(page).toHaveURL(/summary/);

        const prospectingSection = page.getByText('PROSPECTING', { exact: true });
        const riasNavLink = page.getByRole('link', { name: 'RIAs', exact: true });

        await expect(prospectingSection).toBeVisible();
        await expect(riasNavLink).toBeVisible();

        await riasNavLink.click();

        await expect(page).toHaveURL(/\/rias$/);
        await expect(page.getByRole('heading', { name: /Explore RIAs/i })).toBeVisible();
    });
});
