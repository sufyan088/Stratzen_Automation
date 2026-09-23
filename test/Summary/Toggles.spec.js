const { test, expect } = require('@playwright/test');

test.describe('Summary Module - Toggle Visibility', () => {
    test('TC002_SummaryPageDisplay_ToggleCardsOff', async ({ page }) => {
        const email = 'SZ_AutoQA@stratzen.ai';
        const passwordValue = 'StratzenAutomation123';

        // Step 1: Navigate to Login Page.
        await page.goto('https://demoapp.stratzen.ai/login', {
            waitUntil: 'domcontentloaded',
            timeout: 90000,
        });
        await expect(page).toHaveURL(/login/);

        // Step 2: Enter Email.
        const emailField = page.locator('input[type="email"]');
        await expect(emailField).toBeVisible();
        await emailField.fill(email);

        // Step 3: Enter Password.
        const passwordField = page.locator('input[type="password"]');
        await expect(passwordField).toBeVisible();
        await passwordField.fill(passwordValue);

        // Step 4: Click Sign In.
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForLoadState('networkidle');
        await expect(page).not.toHaveURL(/login/);

        // Step 5: Open Preferences from the profile menu.
        await page.getByText('QA', { exact: true }).click();
        await page.getByRole('menuitem', { name: 'Preferences' }).click();
        await expect(page).toHaveURL(/preferences/);

        // Step 6: Navigate to Summary Page Display.
        await expect(page.getByRole('button', { name: 'Summary Page Display', exact: true })).toBeVisible();

        // Step 7-11: Turn OFF CPI, China, Forex News, and News Market.
        const cpiToggle = page.getByRole('button', { name: 'Toggle CPI', exact: true });
        const chinaToggle = page.getByRole('button', { name: 'Toggle China', exact: true });
        const forexNewsToggle = page.getByRole('button', { name: 'Toggle Forex News', exact: true });
        const newsMarketToggle = page.getByRole('button', { name: 'Toggle News Market', exact: true });

        await cpiToggle.scrollIntoViewIfNeeded();
        if ((await cpiToggle.getAttribute('aria-pressed')) !== 'false') {
            await cpiToggle.click();
        }
        await expect(cpiToggle).toHaveAttribute('aria-pressed', 'false');

        await chinaToggle.scrollIntoViewIfNeeded();
        if ((await chinaToggle.getAttribute('aria-pressed')) !== 'false') {
            await chinaToggle.click();
        }
        await expect(chinaToggle).toHaveAttribute('aria-pressed', 'false');

        await forexNewsToggle.scrollIntoViewIfNeeded();
        if ((await forexNewsToggle.getAttribute('aria-pressed')) !== 'false') {
            await forexNewsToggle.click();
        }
        await expect(forexNewsToggle).toHaveAttribute('aria-pressed', 'false');

        await newsMarketToggle.scrollIntoViewIfNeeded();
        if ((await newsMarketToggle.getAttribute('aria-pressed')) !== 'false') {
            await newsMarketToggle.click();
        }
        await expect(newsMarketToggle).toHaveAttribute('aria-pressed', 'false');

        await page.pause();

        // Step 12: Confirm the Save Preferences action is available, then navigate from the sidebar without clicking it.
        const savePreferencesButton = page.getByRole('button', { name: 'Save Preferences' });
        await savePreferencesButton.scrollIntoViewIfNeeded();
        await expect(savePreferencesButton).toBeVisible();

        await page.getByRole('link', { name: 'Summary', exact: true }).click();
        const discardChangesDialog = page.getByRole('dialog');
        await expect(discardChangesDialog).toBeVisible();
        await expect(discardChangesDialog).toContainText('Discard changes?');
        await discardChangesDialog
            .getByRole('button', { name: 'Discard', exact: true })
            .click();
        await expect(page).toHaveURL(/summary/);

        // Step 13-19: Verify the disabled subsections are not displayed on Summary.

        const macroSection = page.getByText('Macro Economic Indicators').first();
        await macroSection.scrollIntoViewIfNeeded();
        await expect(page.getByText('CPI', { exact: true })).not.toBeVisible();

        const riskPremiumSection = page.getByText('Risk Premium Indicator').first();
        await riskPremiumSection.scrollIntoViewIfNeeded();
        await expect(page.getByText('China', { exact: true })).not.toBeVisible();

        const keyEventsSection = page.getByText('Key Economic and Market Events').first();
        await keyEventsSection.scrollIntoViewIfNeeded();
        await expect(page.getByText('Forex News', { exact: true })).not.toBeVisible();
        await expect(page.getByText('News Market', { exact: true })).not.toBeVisible();
    });
});