import { test, expect } from '@playwright/test';

test.describe('RIA Module - Open RIAs List View', () => {
	test.describe.configure({ timeout: 90000 });
    test('TC_VerifyUserCanLoginAndNavigateToRiasListView', async ({ page }) => {

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
        await test.step('Step 1: Navigate to the login page', async () => {
            await page.goto(buildUrl('/login'), {
                waitUntil: 'domcontentloaded',
                timeout: 90000,
            });
            await expect(page).toHaveURL(/login/);
        });

        // Step 2: Enter the email address.
        await test.step('Step 2: Enter the email address', async () => {
            const emailField = page.getByRole('textbox', { name: /email/i }).or(page.locator('input[type="email"]')).first();
            await expect(emailField).toBeVisible();
            await emailField.fill(email);
        });

        // Step 3: Enter the password.
        await test.step('Step 3: Enter the password', async () => {
            const passwordField = page.locator('input[type="password"]').first();
            await expect(passwordField).toBeVisible();
            await passwordField.fill(passwordValue);
        });

        // Step 4: Click the Sign In button.
        await test.step('Step 4: Click the Sign In button', async () => {
            await page.getByRole('button', { name: /sign in/i }).click();
        });

        // Step 5: Verify the Summary page loads.
        await test.step('Step 5: Verify the Summary page loads', async () => {
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveURL(/summary/);
        });

        // Step 6: Open the RIAs list view.
        await test.step('Step 6: Open the RIAs list view', async () => {
            const prospectingSection = page.getByText('PROSPECTING', { exact: true });
            const riasNavLink = page.getByRole('link', { name: 'RIAs', exact: true });

            await expect(prospectingSection).toBeVisible();
            await expect(riasNavLink).toBeVisible();
            await riasNavLink.click();
            await expect(page).toHaveURL(/\/rias$/);
            await expect(page.getByRole('heading', { name: /Explore RIAs/i })).toBeVisible();
        });

        // Step 7: Log out so the test remains independent.
        await test.step('Step 7: Log out so the test remains independent', async () => {
            await page.getByText('QA', { exact: true }).click();
            await page.getByRole('menuitem', { name: 'Logout' }).click();
            await expect(page).toHaveURL(/login/);
        });
    });
});
