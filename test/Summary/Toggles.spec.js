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

		await test.step('Step 1: Navigate to Login Page', async () => {
			await page.goto(buildUrl('/login'), {
				waitUntil: 'domcontentloaded',
				timeout: 90000,
			});
			await expect(page).toHaveURL(/login/);
		});

		await test.step('Step 2: Enter the email address', async () => {
			const emailField = page.locator('input[type="email"]');
			await expect(emailField).toBeVisible();
			await emailField.fill(email);
		});

		await test.step('Step 3: Enter the password', async () => {
			const passwordField = page.locator('input[type="password"]');
			await expect(passwordField).toBeVisible();
			await passwordField.fill(passwordValue);
		});

		await test.step('Step 4: Click the Sign In button', async () => {
			await page.getByRole('button', { name: /sign in/i }).click();
		});

		await test.step('Step 5: Verify the login redirect completes', async () => {
			await page.waitForLoadState('networkidle');
			await expect(page).not.toHaveURL(/login/);
		});

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

		const setToggleStateIfAvailable = async (toggle, shouldBeOn) => {
			if ((await toggle.count()) === 0) {
				return { available: false, changed: false };
			}

			await toggle.scrollIntoViewIfNeeded();

			const targetValue = shouldBeOn ? 'true' : 'false';
			if ((await toggle.getAttribute('aria-pressed')) !== targetValue) {
				await toggle.click();
				await expect(toggle).toHaveAttribute('aria-pressed', targetValue);
				return { available: true, changed: true };
			}

			await expect(toggle).toHaveAttribute('aria-pressed', targetValue);
			return { available: true, changed: false };
		};

		const savePreferences = async () => {
			await page.locator('main').evaluate((element) => {
				element.scrollTo({ top: element.scrollHeight });
			});
			await savePreferencesButton.scrollIntoViewIfNeeded();
			await expect(savePreferencesButton).toBeVisible();
			await savePreferencesButton.dispatchEvent('click');
			await expect(savePreferencesButton).toBeEnabled({ timeout: 30000 });
			await page.waitForLoadState('networkidle');
		};

		const navigateToSummary = async () => {
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
				await savePreferences();
			}

			await expect(page).toHaveURL(/summary/);
		};

		let cpiAvailable = false;
		let chinaAvailable = false;
		let forexNewsAvailable = false;
		let newsMarketAvailable = false;

		await test.step('Step 7: Turn off configured Summary toggles when available', async () => {
			const cpiResult = await setToggleStateIfAvailable(cpiToggle, false);
			const chinaResult = await setToggleStateIfAvailable(chinaToggle, false);
			const forexNewsResult = await setToggleStateIfAvailable(forexNewsToggle, false);
			const newsMarketResult = await setToggleStateIfAvailable(newsMarketToggle, false);

			cpiAvailable = cpiResult.available;
			chinaAvailable = chinaResult.available;
			forexNewsAvailable = forexNewsResult.available;
			newsMarketAvailable = newsMarketResult.available;
		});

		await test.step('Step 8: Save preferences and verify the cards are hidden on Summary', async () => {
			await savePreferences();
			await navigateToSummary();

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

		await test.step('Step 9: Return to Preferences and turn the toggles back on', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Preferences' }).click();
			await expect(page).toHaveURL(/preferences/);
			await expect(page.getByRole('button', { name: 'Summary Page Display', exact: true })).toBeVisible();

			if (cpiAvailable) {
				await setToggleStateIfAvailable(cpiToggle, true);
			}
			if (chinaAvailable) {
				await setToggleStateIfAvailable(chinaToggle, true);
			}
			if (forexNewsAvailable) {
				await setToggleStateIfAvailable(forexNewsToggle, true);
			}
			if (newsMarketAvailable) {
				await setToggleStateIfAvailable(newsMarketToggle, true);
			}

			await savePreferences();
			await navigateToSummary();
		});

		await test.step('Step 10: Verify the toggled content is restored on Summary', async () => {
			await expect(page.getByRole('heading', { name: 'Market Pulse Live advisor briefing, refreshes every 3 hours.' })).toBeVisible();

			if (cpiAvailable) {
				await expect(page.locator('main')).toContainText('CPI');
			}

			const restoredMacroSection = page.getByText('Macro Economic Indicators').first();
			if ((await restoredMacroSection.count()) > 0) {
				await restoredMacroSection.scrollIntoViewIfNeeded();
				await expect(restoredMacroSection).toBeVisible();
			}
		});

		await test.step('Step 11: Log out', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
		});
	});
});