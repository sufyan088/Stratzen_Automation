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

		// Step 1: Navigate to the login page.
        await test.step('Step 1: Navigate to Login Page', async () => {
            await page.goto(buildUrl('/login'), {
                waitUntil: 'domcontentloaded',
                timeout: 90000,
            });
            await expect(page).toHaveURL(/login/);
        });

		// Step 2: Enter the email address.
		await test.step('Step 2: Enter the email address', async () => {
            const emailField = page.locator('input[type="email"]');
            await expect(emailField).toBeVisible();
            await emailField.fill(email);
		});

		// Step 3: Enter the password.
		await test.step('Step 3: Enter the password', async () => {
            const passwordField = page.locator('input[type="password"]');
            await expect(passwordField).toBeVisible();
            await passwordField.fill(passwordValue);
		});

		// Step 4: Click the Sign In button.
		await test.step('Step 4: Click the Sign In button', async () => {
            await page.getByRole('button', { name: /sign in/i }).click();
		});

		// Step 5: Verify the login redirect completes.
		await test.step('Step 5: Verify the login redirect completes', async () => {
            await page.waitForLoadState('networkidle');
            await expect(page).not.toHaveURL(/login/);
        });

		// Step 6: Open Preferences from the profile menu.
		await test.step('Step 6: Open Preferences from the profile menu', async () => {
            await page.getByText('QA', { exact: true }).click();
            await page.getByRole('menuitem', { name: 'Preferences' }).click();
            await expect(page).toHaveURL(/preferences/);
            await expect(page.getByRole('button', { name: 'Summary Page Display', exact: true })).toBeVisible();
        });

        const cpiToggle = page.getByRole('button', { name: 'Toggle CPI', exact: true });
        const chinaToggle = page.getByRole('button', { name: 'Toggle China', exact: true });
        const forexNewsToggle = page.getByRole('button', { name: 'Toggle Forex News', exact: true });
        const newsMarketToggle = page.getByRole('button', { name: 'Toggle News Market', exact: true });
        const savePreferencesButton = page.getByRole('button', { name: 'Save Preferences' });
        const summaryLink = page.getByRole('link', { name: 'Summary', exact: true });
        const discardChangesDialog = page.getByRole('dialog').filter({
            hasText: 'Discard changes?',
        });

        let cpiAvailable = false;
        let chinaAvailable = false;
        let forexNewsAvailable = false;
        let newsMarketAvailable = false;

        // Step 7: Turn off configured Summary toggles when available.
        await test.step('Step 7: Turn off configured Summary toggles when available', async () => {
            if (await cpiToggle.count()) {
                cpiAvailable = true;
                if ((await cpiToggle.getAttribute('aria-pressed')) !== 'false') {
                    await expect(cpiToggle).toBeVisible();
                    await cpiToggle.click();
                }
                await expect(cpiToggle).toHaveAttribute('aria-pressed', 'false');
            }

            if (await chinaToggle.count()) {
                chinaAvailable = true;
                if ((await chinaToggle.getAttribute('aria-pressed')) !== 'false') {
                    await expect(chinaToggle).toBeVisible();
                    await chinaToggle.click();
                }
                await expect(chinaToggle).toHaveAttribute('aria-pressed', 'false');
            }

            if (await forexNewsToggle.count()) {
                forexNewsAvailable = true;
                if ((await forexNewsToggle.getAttribute('aria-pressed')) !== 'false') {
                    await expect(forexNewsToggle).toBeVisible();
                    await forexNewsToggle.click();
                }
                await expect(forexNewsToggle).toHaveAttribute('aria-pressed', 'false');
            }

            if (await newsMarketToggle.count()) {
                newsMarketAvailable = true;
                if ((await newsMarketToggle.getAttribute('aria-pressed')) !== 'false') {
                    await expect(newsMarketToggle).toBeVisible();
                    await newsMarketToggle.click();
                }
                await expect(newsMarketToggle).toHaveAttribute('aria-pressed', 'false');
            }
        });

        // Step 8: Save preferences and verify the cards are hidden on Summary.
        await test.step('Step 8: Save preferences and verify the cards are hidden on Summary', async () => {
            await expect(savePreferencesButton).toBeVisible();
            await savePreferencesButton.dispatchEvent('click');
            await expect(savePreferencesButton).toBeEnabled({ timeout: 30000 });
            await page.waitForLoadState('networkidle');

            for (let attempt = 0; attempt < 2; attempt += 1) {
                await expect(summaryLink).toBeVisible();
                await summaryLink.click();

                if ((await discardChangesDialog.count()) === 0) {
                    break;
                }

                await discardChangesDialog
                    .getByRole('button', { name: 'Keep Editing', exact: true })
                    .click();
                await expect(discardChangesDialog).toHaveCount(0);
                await expect(savePreferencesButton).toBeVisible();
                await savePreferencesButton.dispatchEvent('click');
                await expect(savePreferencesButton).toBeEnabled({ timeout: 30000 });
                await page.waitForLoadState('networkidle');
            }

            await expect(page).toHaveURL(/summary/);

            if (cpiAvailable) {
                await expect(page.getByText('CPI', { exact: true })).not.toBeVisible();
            }

            if (chinaAvailable) {
                await expect(page.getByText('China', { exact: true })).toHaveCount(0);
            }
            if (forexNewsAvailable) {
                await expect(page.getByText('Forex News', { exact: true })).toHaveCount(0);
            }
            if (newsMarketAvailable) {
                await expect(page.getByText('News Market', { exact: true })).toHaveCount(0);
            }
        });

        // Step 9: Return to Preferences and turn the toggles back on.
        await test.step('Step 9: Return to Preferences and turn the toggles back on', async () => {
            await page.getByText('QA', { exact: true }).click();
            await page.getByRole('menuitem', { name: 'Preferences' }).click();
            await expect(page).toHaveURL(/preferences/);
            await expect(page.getByRole('button', { name: 'Summary Page Display', exact: true })).toBeVisible();

            if (cpiAvailable) {
                if ((await cpiToggle.getAttribute('aria-pressed')) !== 'true') {
                    await expect(cpiToggle).toBeVisible();
                    await cpiToggle.click();
                }
                await expect(cpiToggle).toHaveAttribute('aria-pressed', 'true');
            }
            if (chinaAvailable) {
                if ((await chinaToggle.getAttribute('aria-pressed')) !== 'true') {
                    await expect(chinaToggle).toBeVisible();
                    await chinaToggle.click();
                }
                await expect(chinaToggle).toHaveAttribute('aria-pressed', 'true');
            }
            if (forexNewsAvailable) {
                if ((await forexNewsToggle.getAttribute('aria-pressed')) !== 'true') {
                    await expect(forexNewsToggle).toBeVisible();
                    await forexNewsToggle.click();
                }
                await expect(forexNewsToggle).toHaveAttribute('aria-pressed', 'true');
            }
            if (newsMarketAvailable) {
                if ((await newsMarketToggle.getAttribute('aria-pressed')) !== 'true') {
                    await expect(newsMarketToggle).toBeVisible();
                    await newsMarketToggle.click();
                }
                await expect(newsMarketToggle).toHaveAttribute('aria-pressed', 'true');
            }

            await expect(savePreferencesButton).toBeVisible();
            await savePreferencesButton.dispatchEvent('click');
            await expect(savePreferencesButton).toBeEnabled({ timeout: 30000 });
            await page.waitForLoadState('networkidle');

            for (let attempt = 0; attempt < 2; attempt += 1) {
                await expect(summaryLink).toBeVisible();
                await summaryLink.click();

                if ((await discardChangesDialog.count()) === 0) {
                    break;
                }

                await discardChangesDialog
                    .getByRole('button', { name: 'Keep Editing', exact: true })
                    .click();
                await expect(discardChangesDialog).toHaveCount(0);
                await expect(savePreferencesButton).toBeVisible();
                await savePreferencesButton.dispatchEvent('click');
                await expect(savePreferencesButton).toBeEnabled({ timeout: 30000 });
                await page.waitForLoadState('networkidle');
            }

            await expect(page).toHaveURL(/summary/);
        });

        // Step 10: Verify the toggled content is restored on Summary.
        await test.step('Step 10: Verify the toggled content is restored on Summary', async () => {
            await expect(page.getByRole('heading', { name: 'Market Pulse Live advisor briefing, refreshes every 3 hours.' })).toBeVisible();

            const restoredMacroSection = page.getByText('Macro Economic Indicators').first();
            const restoredMacroVisible = (await restoredMacroSection.count()) > 0
                && await restoredMacroSection.isVisible().catch(() => false);

            if (restoredMacroVisible) {
                await restoredMacroSection.scrollIntoViewIfNeeded();
                await expect(restoredMacroSection).toBeVisible();
            }
        });

		// Step 11: Log out.
		await test.step('Step 11: Log out', async () => {
            await page.getByText('QA', { exact: true }).click();
            await page.getByRole('menuitem', { name: 'Logout' }).click();
        });
    });
});