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
        await page.goto(buildUrl('/login'));

        // Step 2: Verify the login page loads.
        await expect(page).toHaveURL(/login/);

        // Step 3: Enter the email address.
        await page.locator('input[type="email"]').fill(email);
        // Step 4: Enter the password.
        await page.locator('input[type="password"]').fill(passwordValue);

        // Step 5: Click the Sign In button.
        await page.getByRole('button', {
            name: /sign in/i
        }).click();

        // Step 6: Verify the login redirect completes.
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/\/summary(?:[/?#]|$)/);

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
        await expect(macroHeading).toBeVisible();
        await expect(macroDescription).toBeVisible();

    // Step 9: Verify cards are visible.
        await expect(macroRegion).toContainText('Fed Funds Rate');
        await expect(macroRegion).toContainText('Unemployment Rate (U3)');
        await expect(macroRegion).toContainText('CSI');

        const macroRegionText = await macroRegion.innerText();
        const fedFundsValue = (macroRegionText.match(/\b3\.72%\b/) || [''])[0];
        const unemploymentValue = (macroRegionText.match(/\b4\.4%\b/) || [''])[0];

        // Step 10: Click Read More.
        await macroSection
            .getByRole('button', { name: 'Read More', exact: true })
            .click();

        // Step 11: Verify detail view opens.
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

        await expect(closeDrawerButton).toBeVisible();
        await expect(detailHeading).toBeVisible();

        // Step 12: Verify detail date is displayed.
        await expect(detailDate).toBeVisible();

        // Step 13: Verify narrative references the same headline values.
        await expect(page.locator('body')).toContainText(fedFundsValue);
        await expect(page.locator('body')).toContainText(unemploymentValue);

        // Step 14: Verify source attribution/link is present.
        await expect(sourceAttribution).toBeVisible();
        await expect(sourceLink).toBeVisible();

        // Step 15: Close detail view using X.
        await closeDrawerButton.click();

        // Step 16: Verify Summary is restored.
        await expect(
            page.getByRole('link', {
                name: 'Summary',
                exact: true
            })
        ).toBeVisible();

        await expect(detailDate).toHaveCount(0);
        await expect(macroHeading).toBeVisible();
        await expect(macroDescription).toBeVisible();

                // Step 17: Log out.

        await page.getByText('QA', { exact: true }).click();
        await page.getByRole('menuitem', { name: 'Logout' }).click();
    });
});