import { test, expect } from '@playwright/test';

test.describe('Summary Preferences - Summary Page Display', () => {
	test.describe.configure({ timeout: 120000 });

	test('TC018_VerifyAdvisorCanControlSummarySectionsFromPreferences', async ({ page }) => {

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

		const summaryNavLink = page.getByRole('link', { name: 'Summary', exact: true });
		const profileButton = page.getByText('QA', { exact: true });
		const summaryPageDisplayButton = page.getByRole('button', {
			name: 'Summary Page Display',
			exact: true,
		});

		const getToggle = (label) => page.getByRole('button', { name: `Toggle ${label}`, exact: true });
		const getSectionRegion = (headingPattern) => page
			.getByRole('heading', { name: headingPattern })
			.first()
			.locator('xpath=following-sibling::*[1]');
		const discardChangesDialog = page.getByRole('dialog').filter({ hasText: 'Discard changes?' });

		const clickWhenStable = async (locatorFactory) => {
			for (let attempt = 0; attempt < 3; attempt += 1) {
				const locator = locatorFactory();

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

		const savePreferences = async () => {
			const savePreferencesButton = page.getByRole('button', { name: 'Save Preferences' });
			await expect(savePreferencesButton).toBeVisible();
			await expect(savePreferencesButton).toBeEnabled();
			await savePreferencesButton.evaluate((button) => button.click());
			await page.waitForLoadState('networkidle');
		};

		const setToggleState = async (label, shouldBeOn) => {
			const toggle = getToggle(label);
			await expect(toggle).toBeVisible();
			const targetValue = shouldBeOn ? 'true' : 'false';

			if ((await toggle.getAttribute('aria-pressed')) !== targetValue) {
				await clickWhenStable(() => getToggle(label));

				if ((await getToggle(label).getAttribute('aria-pressed')) !== targetValue) {
					await getToggle(label).evaluate((button) => button.click());
				}
			}

			await expect(getToggle(label)).toHaveAttribute('aria-pressed', targetValue);
		};

		const openPreferences = async () => {
			if (/preferences/.test(page.url()) && await summaryPageDisplayButton.isVisible().catch(() => false)) {
				return;
			}

			await clickWhenStable(() => profileButton);
			await clickWhenStable(() => page.getByRole('menuitem', { name: 'Preferences' }));

			if (await discardChangesDialog.isVisible().catch(() => false)) {
				await discardChangesDialog.getByRole('button', { name: 'Keep Editing', exact: true }).click();
			}

			await expect(page).toHaveURL(/preferences/);
			await expect(summaryPageDisplayButton).toBeVisible();
		};

		const goToSummary = async () => {
			for (let attempt = 0; attempt < 2; attempt += 1) {
				await clickWhenStable(() => summaryNavLink);

				if ((await discardChangesDialog.count()) === 0) {
					break;
				}

				await discardChangesDialog.getByRole('button', { name: 'Keep Editing', exact: true }).click();
				await expect(discardChangesDialog).toHaveCount(0);
				await savePreferences();
			}

			await expect(page).toHaveURL(/summary/);
		};

		const ensureAllSummaryDisplayTogglesOn = async () => {
			const toggleLabels = [
				'Macro Economic Indicators',
				'CPI',
				'Risk Premium Indicator',
				'China',
				'Key Economic and Market Events',
				'Forex News',
				'FOMC Recent Summary',
			];

			for (const label of toggleLabels) {
				await setToggleState(label, true);
			}

			await savePreferences();
		};

		const turnOnAllVisibleOffToggles = async () => {
			const offToggleLabels = await page
				.locator('button[aria-pressed="false"]')
				.evaluateAll((buttons) => buttons
					.filter((button) => {
						const element = button;
						const styles = window.getComputedStyle(element);
						return styles.visibility !== 'hidden'
							&& styles.display !== 'none'
							&& element.getClientRects().length > 0;
					})
					.map((button) => button.getAttribute('aria-label')?.replace(/^Toggle\s+/, ''))
					.filter(Boolean));

			for (const label of offToggleLabels) {
				await setToggleState(label, true);
			}

			await savePreferences();
		};

		const macroHeading = page.getByRole('heading', { name: /Macro Economic Indicators/i }).first();
		const riskPremiumHeading = page.getByRole('heading', { name: /Risk Premium Indicator/i }).first();
		const keyEventsHeading = page.getByRole('heading', { name: /Key Economic and Market Events/i }).first();
		const macroRegion = getSectionRegion(/Macro Economic Indicators/i);
		const riskPremiumRegion = getSectionRegion(/Risk Premium Indicator/i);
		const keyEventsRegion = getSectionRegion(/Key Economic and Market Events/i);

		// Step 1: Open the login page.
		await test.step('Step 1: Open the login page', async () => {
			await page.goto(buildUrl('/login'), {
				waitUntil: 'domcontentloaded',
				timeout: 90000,
			});
			await expect(page).toHaveURL(/login/);
		});

		// Step 2: Enter the email address.
		await test.step('Step 2: Enter the email address', async () => {
			const emailField = page.locator('input[type="email"]').first();
			await expect(emailField).toBeVisible();
			await emailField.fill(email);
		});

		// Step 3: Enter the password.
		await test.step('Step 3: Enter the password', async () => {
			const passwordField = page.locator('input[type="password"]').first();
			await expect(passwordField).toBeVisible();
			await passwordField.fill(passwordValue);
		});

		// Step 4: Click the Sign In button.
		await test.step('Step 4: Click the Sign In button', async () => {
			await page.getByRole('button', { name: /sign in/i }).click();
		});

		// Step 5: Click on the Summary module from the left sidebar.
		await test.step('Step 5: Click on the Summary module from the left sidebar', async () => {
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/summary/);
			await clickWhenStable(() => summaryNavLink);
			await expect(page).toHaveURL(/summary/);
		});

		// Step 6: Click on the Profile icon from the top-right corner.
		await test.step('Step 6: Click on the Profile icon from the top-right corner', async () => {
			await clickWhenStable(() => profileButton);
		});

		// Step 7: Click the Preferences option from the dropdown.
		await test.step('Step 7: Click the Preferences option from the dropdown', async () => {
			await clickWhenStable(() => page.getByRole('menuitem', { name: 'Preferences' }));
			await expect(page).toHaveURL(/preferences/);
		});

		// Step 8: Navigate to the Summary Page Display section.
		await test.step('Step 8: Navigate to the Summary Page Display section', async () => {
			await expect(summaryPageDisplayButton).toBeVisible();
		});

		// Step 9: Turn on all parent and child toggles before the actual verification.
		await test.step('Step 9: Turn on all parent and child toggles before the actual verification', async () => {
			await ensureAllSummaryDisplayTogglesOn();
		});

		// Step 10: Re-open Preferences after resetting the toggle states.
		await test.step('Step 10: Re-open Preferences after resetting the toggle states', async () => {
			await openPreferences();
		});

		// Step 11: Locate the Macro Economic Indicators subsection.
		await test.step('Step 11: Locate the Macro Economic Indicators subsection', async () => {
			await setToggleState('Macro Economic Indicators', true);
			await expect(getToggle('CPI')).toBeVisible();
		});

		// Step 12: Turn OFF the CPI toggle.
		await test.step('Step 12: Turn OFF the CPI toggle', async () => {
			await setToggleState('CPI', false);
		});

		// Step 13: Locate the Risk Premium Indicator subsection.
		await test.step('Step 13: Locate the Risk Premium Indicator subsection', async () => {
			await setToggleState('Risk Premium Indicator', true);
			await expect(getToggle('China')).toBeVisible();
		});

		// Step 14: Turn OFF the China toggle.
		await test.step('Step 14: Turn OFF the China toggle', async () => {
			await setToggleState('China', false);
		});

		// Step 15: Locate the Key Economic and Market Events subsection.
		await test.step('Step 15: Locate the Key Economic and Market Events subsection', async () => {
			await setToggleState('Key Economic and Market Events', true);
			await expect(getToggle('Forex News')).toBeVisible();
			await expect(getToggle('FOMC Recent Summary')).toBeVisible();
		});

		// Step 16: Turn OFF the Forex News toggle.
		await test.step('Step 16: Turn OFF the Forex News toggle', async () => {
			await setToggleState('Forex News', false);
		});

		// Step 17: Turn OFF the FOMC Recent Summary toggle.
		await test.step('Step 17: Turn OFF the FOMC Recent Summary toggle', async () => {
			await setToggleState('FOMC Recent Summary', false);
			await savePreferences();
		});

		// Step 18: Click on the Summary module from the left sidebar.
		await test.step('Step 18: Click on the Summary module from the left sidebar', async () => {
			await goToSummary();
		});

		// Step 19: Scroll to the Macro Economic Indicators section.
		await test.step('Step 19: Scroll to the Macro Economic Indicators section', async () => {
			await macroHeading.scrollIntoViewIfNeeded();
			await expect(macroHeading).toBeVisible();
			await expect(macroRegion).toBeVisible();
		});

		// Step 20: Verify the CPI subsection is not displayed.
		await test.step('Step 20: Verify the CPI subsection is not displayed', async () => {
			await expect(macroRegion).not.toContainText(/\bCPI\b/i);
		});

		// Step 21: Scroll to the Risk Premium Indicator section.
		await test.step('Step 21: Scroll to the Risk Premium Indicator section', async () => {
			await riskPremiumHeading.scrollIntoViewIfNeeded();
			await expect(riskPremiumHeading).toBeVisible();
			await expect(riskPremiumRegion).toBeVisible();
		});

		// Step 22: Verify the China subsection is not displayed.
		await test.step('Step 22: Verify the China subsection is not displayed', async () => {
			await expect(riskPremiumRegion).not.toContainText('China');
		});

		// Step 23: Scroll to the Key Economic and Market Events section.
		await test.step('Step 23: Scroll to the Key Economic and Market Events section', async () => {
			await keyEventsHeading.scrollIntoViewIfNeeded();
			await expect(keyEventsHeading).toBeVisible();
			await expect(keyEventsRegion).toBeVisible();
		});

		// Step 24: Verify the Forex News subsection is not displayed.
		await test.step('Step 24: Verify the Forex News subsection is not displayed', async () => {
			await expect(keyEventsRegion).not.toContainText(/Forex News/i);
		});

		// Step 25: Verify the FOMC Recent Summary subsection is not displayed.
		await test.step('Step 25: Verify the FOMC Recent Summary subsection is not displayed', async () => {
			await expect(keyEventsRegion).not.toContainText(/FOMC Recent Summary/i);
		});

		// Step 26: Click on the Profile icon from the top-right corner.
		await test.step('Step 26: Click on the Profile icon from the top-right corner', async () => {
			await clickWhenStable(() => profileButton);
		});

		// Step 27: Click the Preferences option from the dropdown.
		await test.step('Step 27: Click the Preferences option from the dropdown', async () => {
			await clickWhenStable(() => page.getByRole('menuitem', { name: 'Preferences' }));
			await expect(page).toHaveURL(/preferences/);
			await expect(summaryPageDisplayButton).toBeVisible();
		});

		// Step 28: Turn ON the CPI toggle.
		await test.step('Step 28: Turn ON the CPI toggle', async () => {
			await setToggleState('Macro Economic Indicators', true);
			await setToggleState('CPI', true);
		});

		// Step 29: Turn ON the China toggle.
		await test.step('Step 29: Turn ON the China toggle', async () => {
			await setToggleState('Risk Premium Indicator', true);
			await setToggleState('China', true);
		});

		// Step 30: Turn ON the Forex News toggle.
		await test.step('Step 30: Turn ON the Forex News toggle', async () => {
			await setToggleState('Key Economic and Market Events', true);
			await setToggleState('Forex News', true);
		});

		// Step 31: Turn ON the FOMC Recent Summary toggle.
		await test.step('Step 31: Turn ON the FOMC Recent Summary toggle', async () => {
			await setToggleState('FOMC Recent Summary', true);
			await savePreferences();
		});

		// Step 32: Click on the Summary module from the left sidebar.
		await test.step('Step 32: Click on the Summary module from the left sidebar', async () => {
			await goToSummary();
		});

		// Step 33: Scroll to the Macro Economic Indicators section.
		await test.step('Step 33: Scroll to the Macro Economic Indicators section', async () => {
			await macroHeading.scrollIntoViewIfNeeded();
			await expect(macroHeading).toBeVisible();
		});

		// Step 34: Verify the CPI subsection is displayed.
		await test.step('Step 34: Verify the CPI subsection is displayed', async () => {
			await expect(macroRegion).toContainText(/\bCPI\b/i);
		});

		// Step 35: Scroll to the Risk Premium Indicator section.
		await test.step('Step 35: Scroll to the Risk Premium Indicator section', async () => {
			await riskPremiumHeading.scrollIntoViewIfNeeded();
			await expect(riskPremiumHeading).toBeVisible();
		});

		// Step 36: Verify the China subsection is displayed.
		await test.step('Step 36: Verify the China subsection is displayed', async () => {
			await expect(riskPremiumRegion).toContainText('China');
		});

		// Step 37: Scroll to the Key Economic and Market Events section.
		await test.step('Step 37: Scroll to the Key Economic and Market Events section', async () => {
			await keyEventsHeading.scrollIntoViewIfNeeded();
			await expect(keyEventsHeading).toBeVisible();
			await expect(keyEventsRegion).toBeVisible();
		});

		// Step 38: Verify the Forex News subsection is displayed.
		await test.step('Step 38: Verify the Forex News subsection is displayed', async () => {
			await expect(keyEventsRegion).toContainText(/Forex News/i);
		});

		// Step 39: Verify the FOMC Recent Summary subsection is displayed.
		await test.step('Step 39: Verify the FOMC Recent Summary subsection is displayed', async () => {
			await expect(keyEventsRegion).toContainText(/FOMC Recent Summary/i);
		});

		// Step 40: Turn on any visible toggles that are still off.
		await test.step('Step 40: Turn on all visible toggles that are off', async () => {
			await openPreferences();
			await turnOnAllVisibleOffToggles();
			await savePreferences();
		});

		// Step 41: Logout from the application.
		await test.step('Step 41: Logout from the application', async () => {
			await clickWhenStable(() => profileButton);
			await clickWhenStable(() => page.getByRole('menuitem', { name: 'Logout' }));
			await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
		});
	});
});
