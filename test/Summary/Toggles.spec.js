const { test, expect } = require('@playwright/test');

test.describe('Summary Module - Toggle Visibility', () => {
    test.describe.configure({ timeout: 120000 });

    test('TC002_SummaryPageDisplay_ToggleCardsOff', async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 1400 });

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

        // Step 7-11: Turn OFF the requested toggles when they are available.
        const cpiToggle = page.getByRole('button', { name: 'Toggle CPI', exact: true });
        const chinaToggle = page.getByRole('button', { name: 'Toggle China', exact: true });
        const forexNewsToggle = page.getByRole('button', { name: 'Toggle Forex News', exact: true });
        const newsMarketToggle = page.getByRole('button', { name: 'Toggle News Market', exact: true });
        const setToggleStateIfAvailable = async (toggle, shouldBeOn) => {
            if (await toggle.count()) {
                await toggle.scrollIntoViewIfNeeded();

                const targetValue = shouldBeOn ? 'true' : 'false';
                if ((await toggle.getAttribute('aria-pressed')) !== targetValue) {
                    await toggle.click();
                    await expect(toggle).toHaveAttribute('aria-pressed', targetValue);
                    return { available: true, changed: true };
                }

                await expect(toggle).toHaveAttribute('aria-pressed', targetValue);
                return { available: true, changed: false };
            }

            return { available: false, changed: false };
        };
        const savePreferences = async () => {
            await page.locator('main').evaluate((element) => {
                element.scrollTo({ top: element.scrollHeight, behavior: 'instant' });
            });
            await savePreferencesButton.scrollIntoViewIfNeeded();
            await expect(savePreferencesButton).toBeVisible();
            await savePreferencesButton.dispatchEvent('click');
            await page.waitForTimeout(30000);
            await page.waitForLoadState('networkidle');
        };

        const cpiResult = await setToggleStateIfAvailable(cpiToggle, false);

        const chinaResult = await setToggleStateIfAvailable(chinaToggle, false);
        const forexNewsResult = await setToggleStateIfAvailable(forexNewsToggle, false);
        const newsMarketResult = await setToggleStateIfAvailable(newsMarketToggle, false);

        // Step 12: Save the preferences, then return to Summary.
        const savePreferencesButton = page.getByRole('button', { name: 'Save Preferences' });
        const summaryLink = page.getByRole('link', { name: 'Summary', exact: true });
        const discardChangesDialog = page.getByRole('dialog').filter({
            hasText: 'Discard changes?',
        });
        const navigateToSummary = async () => {
            for (let attempt = 0; attempt < 2; attempt += 1) {
                await summaryLink.click();

                if ((await discardChangesDialog.count()) === 0) {
                    break;
                }

                await discardChangesDialog
                    .getByRole('button', { name: 'Keep Editing', exact: true })
                    .click();
                await expect(discardChangesDialog).toHaveCount(0);
                await savePreferences();
            }

            await expect(page).toHaveURL(/summary/);
        };

        await savePreferences();
        await navigateToSummary();

        // Step 13-19: Verify the requested cards/news items are not displayed on Summary.

        const macroSection = page.getByText('Macro Economic Indicators').first();
        const mainContent = page.locator('main');
        await macroSection.scrollIntoViewIfNeeded();
        if (cpiResult.available) {
            await expect(page.getByText('CPI', { exact: true })).not.toBeVisible();
        }

        if (chinaResult.available) {
            await expect(page.getByText('China', { exact: true })).toHaveCount(0);
        }
        if (forexNewsResult.available) {
            await expect(page.getByText('Forex News', { exact: true })).toHaveCount(0);
        }
        if (newsMarketResult.available) {
            await expect(page.getByText('News Market', { exact: true })).toHaveCount(0);
        }

        // Step 20-23: Return to Preferences and turn ON the requested toggles when available.
        await page.getByText('QA', { exact: true }).click();
        await page.getByRole('menuitem', { name: 'Preferences' }).click();
        await expect(page).toHaveURL(/preferences/);
        await expect(page.getByRole('button', { name: 'Summary Page Display', exact: true })).toBeVisible();

        if (cpiResult.available) {
            await setToggleStateIfAvailable(cpiToggle, true);
        }
        if (chinaResult.available) {
            await setToggleStateIfAvailable(chinaToggle, true);
        }
        if (forexNewsResult.available) {
            await setToggleStateIfAvailable(forexNewsToggle, true);
        }
        if (newsMarketResult.available) {
            await setToggleStateIfAvailable(newsMarketToggle, true);
        }

        await savePreferences();
        await navigateToSummary();

        // Step 24-27: Verify the requested items are visible again on Summary.
        await macroSection.scrollIntoViewIfNeeded();
        await expect(mainContent).toContainText('CPI');

        if (chinaResult.available) {
            await expect(mainContent).toContainText('China');
        }

        if (forexNewsResult.available) {
            await expect(mainContent).toContainText('Forex News');
        }

        if (newsMarketResult.available) {
            await expect(mainContent).toContainText('News Market');
        }

          // logout 

        await page.getByText('QA', { exact: true }).click();
        await page.getByRole('menuitem', { name: 'Logout' }).click(); 
    });
});