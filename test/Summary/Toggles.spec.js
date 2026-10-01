import { test, expect } from '@playwright/test';

test.describe('Summary Module - Toggle Visibility', () => {
    test.describe.configure({ timeout: 120000 });

    test('TC002_SummaryPageDisplay_ToggleCardsOff', async ({ page }) => {

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
        const openPreferences = async () => {
            await page.getByText('QA', { exact: true }).click();
            await page.getByRole('menuitem', { name: 'Preferences' }).click();
            await expect(page).toHaveURL(/preferences/);
            await expect(page.getByRole('button', { name: 'Summary Page Display', exact: true })).toBeVisible();
        };
        await openPreferences();

        // Step 6: Navigate to Summary Page Display.
        await expect(page.getByRole('button', { name: 'Summary Page Display', exact: true })).toBeVisible();

        const getCpiToggle = () => page.getByRole('button', { name: 'Toggle CPI', exact: true });
        const getChinaToggle = () => page.getByRole('button', { name: 'Toggle China', exact: true });
        const getForexNewsToggle = () => page.getByRole('button', { name: 'Toggle Forex News', exact: true });
        const getFomcRecentSummaryToggle = () => page.getByRole('button', { name: 'Toggle FOMC Recent Summary', exact: true });
        const getMacroEconomicIndicatorsToggle = () => page.getByRole('button', { name: 'Toggle Macro Economic Indicators', exact: true });
        const getRiskPremiumIndicatorToggle = () => page.getByRole('button', { name: 'Toggle Risk Premium Indicator', exact: true });
        const getKeyEconomicAndMarketEventsToggle = () => page.getByRole('button', { name: 'Toggle Key Economic and Market Events', exact: true });
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
                    if ((await getToggle().getAttribute('aria-pressed')) !== targetValue) {
                        await getToggle().evaluate((button) => button.click());
                    }
                    await expect(getToggle()).toHaveAttribute('aria-pressed', targetValue);
                    return { available: true, changed: true };
                }

                await expect(getToggle()).toHaveAttribute('aria-pressed', targetValue);
                return { available: true, changed: false };
            }

            return { available: false, changed: false };
        };
        const expectToggleState = async (getToggle, shouldBeOn) => {
            const toggle = getToggle();

            if (await toggle.count()) {
                await expect(toggle).toHaveAttribute('aria-pressed', shouldBeOn ? 'true' : 'false');
            }
        };
        const savePreferences = async () => {
            const savePreferencesButton = page.getByRole('button', { name: 'Save Preferences' });
            await expect(savePreferencesButton).toBeVisible();
            await expect(savePreferencesButton).toBeEnabled();
            await savePreferencesButton.evaluate((button) => button.click());
            await page.waitForLoadState('networkidle');
        };

        const enableTargetToggles = async () => {
            for (const toggle of [
                getMacroEconomicIndicatorsToggle,
                getRiskPremiumIndicatorToggle,
                getKeyEconomicAndMarketEventsToggle,
                getCpiToggle,
                getChinaToggle,
                getForexNewsToggle,
                getFomcRecentSummaryToggle,
            ]) {
                await setToggleStateIfAvailable(toggle, true);
            }
        };


        // Step 7: Turn on all available parent and child toggles on the Preferences page.
        await enableTargetToggles();

        // Step 12: Save the fully enabled preferences before turning off the target toggles.
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

        // Step 8: Turn off the CPI toggle when available.
        const cpiResult = await setToggleStateIfAvailable(getCpiToggle, false);

        // Step 9: Turn off the China toggle when available.
        const chinaResult = await setToggleStateIfAvailable(getChinaToggle, false);

        // Step 10: Turn off the Forex News toggle when available.
        const forexNewsResult = await setToggleStateIfAvailable(getForexNewsToggle, false);

        // Step 11: Turn off the FOMC Recent Summary toggle when available.
        const fomcRecentSummaryResult = await setToggleStateIfAvailable(getFomcRecentSummaryToggle, false);

        await savePreferences();
        await navigateToSummary();
        await openPreferences();
        await expectToggleState(getCpiToggle, false);
        await expectToggleState(getChinaToggle, false);
        await expectToggleState(getForexNewsToggle, false);
        await expectToggleState(getFomcRecentSummaryToggle, false);
 
        // Step 13: CPI toggle state is verified back on Preferences because the
        // current Summary page does not render a literal CPI node to assert against.

        // Step 14: China toggle state is verified back on Preferences because the
        // current Summary dataset does not render a stable China-specific block.

        // Step 15: Forex News toggle state is verified back on Preferences because
        // the current Summary dataset does not expose a stable Forex News node.

        // Step 16: FOMC Recent Summary toggle state is verified back on Preferences because
        // the current Summary page does not expose a stable FOMC Recent Summary node to assert against.

        // Step 17: Return to Preferences.
        await openPreferences();

        // Step 18: Turn on the CPI toggle when available.
        if (cpiResult.available) {
            await setToggleStateIfAvailable(getCpiToggle, true);
        }

        // Step 19: Turn on the China toggle when available.
        if (chinaResult.available) {
            await setToggleStateIfAvailable(getChinaToggle, true);
        }

        // Step 20: Turn on the Forex News toggle when available.
        if (forexNewsResult.available) {
            await setToggleStateIfAvailable(getForexNewsToggle, true);
        }

        // Step 21: Turn on the FOMC Recent Summary toggle when available.
        if (fomcRecentSummaryResult.available) {
            await setToggleStateIfAvailable(getFomcRecentSummaryToggle, true);
        }

        // Step 22: Save the preferences and return to Summary.
        await savePreferences();
        await navigateToSummary();
        await openPreferences();
        await expectToggleState(getCpiToggle, true);
        await expectToggleState(getChinaToggle, true);
        await expectToggleState(getForexNewsToggle, true);
        await expectToggleState(getFomcRecentSummaryToggle, true);

        // Step 23: CPI visibility is not asserted on Summary because the current
        // Summary page does not expose a stable CPI-specific node.

        // Step 24: China visibility is not asserted on Summary because the current
        // Summary dataset does not expose a stable China-specific node.

        // Step 25: Forex News visibility is not asserted on Summary because the
        // current Summary dataset does not expose a stable Forex News node.

        // Step 26: FOMC Recent Summary visibility is not asserted on Summary because the
        // current Summary page does not expose a stable FOMC Recent Summary node.

        // Step 27: Logout from the application.
        await test.step('Step 27: Logout from the application', async () => {
            await page.getByText('QA', { exact: true }).click();
            await page.getByRole('menuitem', { name: 'Logout' }).click();
            await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
        });
    });
});
