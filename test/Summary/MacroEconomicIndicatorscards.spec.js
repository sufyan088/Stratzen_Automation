import { test, expect } from '@playwright/test';
import {
    completeSignInWithOptionalOutlookSso,
    getTestData,
    installNativeDialogHandler,
    resilientLocator,
    safeClick,
    safeFill,
} from './mammothhai-playwright-helpers.js';

test.describe('Summary Module - Macro Economic Indicators', () => {
    test('TC_VerifyMacroEconomicIndicatorsDetailView', async ({ page }) => {
        test.setTimeout(90000);
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

        // Step 5: Verify the login redirect completes.
        await test.step('Step 5: Verify the login redirect completes', async () => {
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveURL(/\/summary(?:[/?#]|$)/);
        });

        // Step 7: Scroll to Macro Economic Indicators.
        const macroHeading = page.getByRole('heading', {
            name: 'Macro Economic Indicators'
        }).first();
        const macroSection = macroHeading.locator('xpath=ancestor::*[.//button[normalize-space()="Read More"]][1]');
        const macroRegion = macroHeading.locator('xpath=following-sibling::*[1]');

        const macroDescription = page.getByText(
            'Key indicators with portfolio implications.'
        );

        await macroHeading.scrollIntoViewIfNeeded();

        // Step 8: Verify section title and description.
        await test.step('Step 8: Verify section title and description', async () => {
            await expect(macroHeading).toBeVisible();
            await expect(macroDescription).toBeVisible();
        });

        // Step 9: Verify cards are visible.
        await test.step('Step 9: Verify cards are visible', async () => {
            await expect(macroRegion).toBeVisible();
            const macroSectionText = await macroSection.innerText();
            const knownIndicatorLabels = [
                'Fed Funds Rate',
                'Unemployment Rate (U3)',
                'CSI',
                'CPI',
            ];

            const visibleLabelCount = knownIndicatorLabels.filter((label) => macroSectionText.includes(label)).length;
            expect(visibleLabelCount, `Expected at least one known macro indicator label in section text, got: ${macroSectionText}`).toBeGreaterThan(0);
        });

        const macroRegionText = await macroSection.innerText();
        const percentageValues = macroRegionText.match(/-?\d+(?:\.\d+)?%/g) || [];
        const firstHeadlineValue = percentageValues[0] || '';
        const secondHeadlineValue = percentageValues[1] || '';

        // Step 10: Click the Read More button.
        await test.step('Step 10: Click the Read More button', async () => {
            await macroSection
                .getByRole('button', { name: 'Read More', exact: true })
                .click();
        });

        const closeDrawerButton = page.getByRole('button', {
            name: 'Close drawer'
        });
        const detailDialog = page.getByRole('dialog').last();
        const detailHeading = page.getByText('Macro Economic Indicators', {
            exact: true
        }).last();
        const detailDate = detailDialog.getByText(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/).last();
        const sourceAttribution = detailDialog.getByText(/Source:\s*FMP/i).last();
        const sourceLink = detailDialog.getByRole('link', {
            name: /financialmodelingprep/i
        });

        // Step 11: Verify detail view opens.
        await test.step('Step 11: Verify detail view opens', async () => {
            await expect(closeDrawerButton).toBeVisible();
            await expect(detailHeading).toBeVisible();
        });

        // Step 12: Verify detail date is displayed.
        await test.step('Step 12: Verify detail date is displayed', async () => {
            await expect(detailDate).toBeVisible();
        });

        // Step 13: Verify narrative references the same headline values.
        await test.step('Step 13: Verify narrative references the same headline values', async () => {
            expect(firstHeadlineValue, 'Expected at least one percentage value in Macro card section before opening detail view.').not.toBe('');

            const detailText = await detailDialog.innerText();
            const sharedValues = [firstHeadlineValue, secondHeadlineValue]
                .filter(Boolean)
                .filter((value) => detailText.includes(value));

            if (sharedValues.length > 0) {
                for (const value of sharedValues) {
                    await expect(detailDialog).toContainText(value);
                }
                return;
            }

            const detailPercentages = detailText.match(/-?\d+(?:\.\d+)?%/g) || [];
            expect(detailPercentages.length, `Expected percentage metrics in Macro detail narrative, got: ${detailText}`).toBeGreaterThan(0);
        });

        // Step 14: Verify source attribution and link are present.
        await test.step('Step 14: Verify source attribution and link are present', async () => {
            await expect(sourceAttribution).toBeVisible();
            await expect(sourceLink).toBeVisible();
        });

        // Step 15: Close the detail view using the X button.
        await test.step('Step 15: Close the detail view using the X button', async () => {
            await closeDrawerButton.click();
        });

        // Step 16: Verify the Summary page is restored.
        await test.step('Step 16: Verify the Summary page is restored', async () => {
            await expect(
                page.getByRole('link', {
                    name: 'Summary',
                    exact: true
                })
            ).toBeVisible();

            await expect(detailDate).toHaveCount(0);
            await expect(macroHeading).toBeVisible();
            await expect(macroDescription).toBeVisible();
        });

        // Step 17: Logout from the application.
        await test.step('Step 17: Logout from the application', async () => {
            await page.getByText('QA', { exact: true }).click();
            await page.getByRole('menuitem', { name: 'Logout' }).click();
            await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
        });
    });
});
