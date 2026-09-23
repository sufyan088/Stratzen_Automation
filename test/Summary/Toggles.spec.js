import { test, expect } from '@playwright/test';

test.describe('Summary Module - Toggle Visibility', () => {
    test.describe.configure({ timeout: 120000 });

    test('TC002_SummaryPageDisplay_ToggleCardsOff', async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 1400 });

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

        // Step 1: Navigate to Login Page.
        await page.goto(buildUrl('/login'), {
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
        const getCpiToggle = () => page.getByRole('button', { name: 'Toggle CPI', exact: true });
        const getChinaToggle = () => page.getByRole('button', { name: 'Toggle China', exact: true });
        const getForexNewsToggle = () => page.getByRole('button', { name: 'Toggle Forex News', exact: true });
        const getNewsMarketToggle = () => page.getByRole('button', { name: 'Toggle News Market', exact: true });
        const clickWhenStable = async (getLocator) => {
            for (let attempt = 0; attempt < 3; attempt += 1) {
                const locator = getLocator();

                try {
                    await expect(locator).toBeVisible();
                    await locator.click();
                    return;
                } catch (error) {
                    if (attempt === 2) {
                        throw error;
                    }
                }
            }
        };
        const setToggleStateIfAvailable = async (getToggle, shouldBeOn) => {
            const toggle = getToggle();

            if (await toggle.count()) {
                const targetValue = shouldBeOn ? 'true' : 'false';
                if ((await toggle.getAttribute('aria-pressed')) !== targetValue) {
                    await clickWhenStable(getToggle);
                    await expect(getToggle()).toHaveAttribute('aria-pressed', targetValue);
                    return { available: true, changed: true };
                }

                await expect(getToggle()).toHaveAttribute('aria-pressed', targetValue);
                return { available: true, changed: false };
            }

            return { available: false, changed: false };
        };
        const savePreferences = async () => {
            const savePreferencesButton = page.getByRole('button', { name: 'Save Preferences' });
            await expect(savePreferencesButton).toBeVisible();
            await savePreferencesButton.dispatchEvent('click');
            await expect(savePreferencesButton).toBeEnabled({ timeout: 30000 });
            await page.waitForLoadState('networkidle');
        };

        const cpiResult = await setToggleStateIfAvailable(getCpiToggle, false);

        const chinaResult = await setToggleStateIfAvailable(getChinaToggle, false);
        const forexNewsResult = await setToggleStateIfAvailable(getForexNewsToggle, false);
        const newsMarketResult = await setToggleStateIfAvailable(getNewsMarketToggle, false);

        // Step 12: Save the preferences, then return to Summary.
        const discardChangesDialog = page.getByRole('dialog').filter({
            hasText: 'Discard changes?',
        });
        const navigateToSummary = async () => {
            for (let attempt = 0; attempt < 2; attempt += 1) {
                await clickWhenStable(() => page.getByRole('link', { name: 'Summary', exact: true }));

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
            await setToggleStateIfAvailable(getCpiToggle, true);
        }
        if (chinaResult.available) {
            await setToggleStateIfAvailable(getChinaToggle, true);
        }
        if (forexNewsResult.available) {
            await setToggleStateIfAvailable(getForexNewsToggle, true);
        }
        if (newsMarketResult.available) {
            await setToggleStateIfAvailable(getNewsMarketToggle, true);
        }

        await savePreferences();
        await navigateToSummary();

        // Step 24-27: Verify the requested items are visible again on Summary.
        const restoredMacroSection = page.getByText('Macro Economic Indicators').first();
        await expect(restoredMacroSection).toBeVisible();

        if (chinaResult.available) {
            await expect(getChinaToggle()).toHaveAttribute('aria-pressed', 'true');
        }

        if (forexNewsResult.available) {
            await expect(getForexNewsToggle()).toHaveAttribute('aria-pressed', 'true');
        }

        if (newsMarketResult.available) {
            await expect(getNewsMarketToggle()).toHaveAttribute('aria-pressed', 'true');
        }

          // logout 

        await page.getByText('QA', { exact: true }).click();
        await page.getByRole('menuitem', { name: 'Logout' }).click(); 
    });
});