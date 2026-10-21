import { test, expect } from '@playwright/test';
import {
    getTestData,
    completeSignInWithOptionalOutlookSso,
    installNativeDialogHandler,
    resilientLocator,
    safeClick,
    safeFill,
} from './mammothhai-playwright-helpers.js';

test.describe('RIA Module - Open RIAs List View', () => {
	test.describe.configure({ timeout: 90000 });
    test('TC_VerifyUserCanLoginAndNavigateToRiasListView', async ({ page }) => {
        installNativeDialogHandler(page);
        const use = test.info().project.use;
        const destinationUrlStep1 = getTestData('destination_url__step1');

        const appBaseUrl = process.env.URL
            || process.env.APP_URL
            || process.env.BASE_URL
            || use.baseURL;

        const destinationUrl = destinationUrlStep1 || `${String(appBaseUrl).replace(/\/+$/, '')}/login`;
        const authUsername = use.username || process.env.STRATZEN_EMAIL;
        const password = use.password || process.env.STRATZEN_PASSWORD;
        const outlookUsername = use.outlookUsername || process.env.OUTLOOK_EMAIL;
        const outlookPassword = use.outlookPassword || process.env.OUTLOOK_PASSWORD;

        if (!destinationUrl) throw new Error('Missing destination_url__step1 / BASEURL test data.');
        if (!authUsername || !password) throw new Error('Missing username or password in project.use or environment variables.');

        // Step 1: Navigate to the login page.
        await test.step('Step 1: Navigate to the login page', async () => {
            await page.goto(destinationUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 90000,
            });
            await expect(page).toHaveURL(/login/);
        });

        // Step 2: Enter the email address.
        await test.step('Step 2: Enter the email address', async () => {
            const emailControl = await resilientLocator(page, ['input[type="email"]'], { labelFallback: 'Email Address', role: 'textbox' });
            await safeFill(emailControl, String(authUsername));
            await expect(page.locator('input[type="email"]').first()).toHaveValue(String(authUsername));
        });

        // Step 3: Enter the password.
        await test.step('Step 3: Enter the password', async () => {
            const passwordControl = await resilientLocator(page, ['input[type="password"]'], { labelFallback: 'Password', role: 'textbox' });
            await safeFill(passwordControl, String(password));
            await expect(page.locator('input[type="password"]').first()).toHaveValue(String(password));
        });

        // Step 4: Click the Sign In button.
        await test.step('Step 4: Click the Sign In button', async () => {
            const signInButton = await resilientLocator(page, ['button[type="submit"]'], { labelFallback: 'Sign In', role: 'button' });
            await safeClick(signInButton, { timeout: 15000 });
            await completeSignInWithOptionalOutlookSso(page, outlookUsername, outlookPassword);
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

        // Step 7: Logout from the application.
        await test.step('Step 7: Logout from the application', async () => {
            await page.getByText('QA', { exact: true }).click();
            await page.getByRole('menuitem', { name: 'Logout' }).click();
            await expect(page).toHaveURL(/login/);
        });
    });
});
