import { test, expect } from '@playwright/test';

test.describe('Summary Module - Macro Economic Indicators', () => {
    test('TC_VerifyMacroEconomicIndicatorsDetailView', async ({ page }) => {
        test.setTimeout(90000);

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
            await page.locator('input[type="email"]').first().fill(email);
        });

        // Step 3: Enter the password.
        await test.step('Step 3: Enter the password', async () => {
            await page.locator('input[type="password"]').first().fill(passwordValue);
        });

        // Step 4: Click the Sign In button.
        await test.step('Step 4: Click the Sign In button', async () => {
            await page.getByRole('button', {
                name: /sign in/i
            }).click();
        });

        // Step 5: Verify the login redirect completes.
        await test.step('Step 5: Verify the login redirect completes', async () => {
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveURL(/\/summary(?:[/?#]|$)/);
        });

        // Step 7: Scroll to Macro Economic Indicators.
        const macroHeading = page.getByRole('heading', {
            name: 'Macro Economic Indicators'
        });
        const macroSection = macroHeading.locator('..');
        const macroRegion = page.getByRole('region').filter({
            hasText: 'Treasury 1y:'
        });

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
            await expect(macroRegion).toContainText('Fed Funds Rate');
            await expect(macroRegion).toContainText('Unemployment Rate (U3)');
            await expect(macroRegion).toContainText('CSI');
        });

        const macroRegionText = await macroRegion.innerText();
        const fedFundsValue = (macroRegionText.match(/\b3\.72%\b/) || [''])[0];
        const unemploymentValue = (macroRegionText.match(/\b4\.4%\b/) || [''])[0];

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
            await expect(page.locator('body')).toContainText(fedFundsValue);
            await expect(page.locator('body')).toContainText(unemploymentValue);
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
