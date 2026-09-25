import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test.describe('Summary Module - Macro Economic Indicators', () => {
	test('TC_VerifyMacroEconomicIndicatorsDetailView', async ({ page }) => {
		await page.setViewportSize({ width: 1600, height: 1400 });

		const baseUrl = process.env.URL
			|| process.env.APP_URL
			|| process.env.BASE_URL
			|| test.info().project.use.baseURL
			|| 'https://demoapp.stratzen.ai';

		const buildUrl = (path) => {
			const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
			const cleanPath = path.startsWith('/') ? path : `/${path}`;
			return `${cleanBaseUrl}${cleanPath}`;
		};
		const email = process.env.STRATZEN_EMAIL || 'SZ_AutoQA@stratzen.ai';
		const passwordValue = process.env.STRATZEN_PASSWORD || 'StratzenAutomation123';

		await test.step('Step 1: Navigate to login page', async () => {
			await page.goto(buildUrl('/login'), {
				waitUntil: 'domcontentloaded',
				timeout: 90000,
			});
			await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({
				timeout: 30000,
			});
		});

		await test.step('Step 2: Enter the email address', async () => {
			const emailField = page.getByRole('textbox', { name: 'Email Address' });
			await expect(emailField).toBeVisible({ timeout: 10000 });
			await emailField.fill(email);
		});

		await test.step('Step 3: Enter the password', async () => {
			const passwordField = page.getByRole('textbox', { name: 'Password' });
			await expect(passwordField).toBeVisible({ timeout: 10000 });
			await passwordField.fill(passwordValue);
		});

		await test.step('Step 4: Click the Sign In button', async () => {
			await page.getByRole('button', { name: /sign in/i }).click();
		});

		await test.step('Step 5: Verify the login redirect completes', async () => {
			await page.waitForLoadState('networkidle');
			await expect(page).not.toHaveURL(/login/);
		});

		const ensureMacroCardsEnabled = async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Preferences' }).click();
			await expect(page).toHaveURL(/preferences/);

			const savePreferencesButton = page.getByRole('button', {
				name: 'Save Preferences',
			});
			const toggleNames = [
				'Toggle CPI',
				'Toggle GDP',
				'Toggle Unemployment Rate',
				'Toggle Consumer Sentiment Index',
			];
			let hasChanges = false;

			for (const toggleName of toggleNames) {
				const toggle = page.getByRole('button', {
					name: toggleName,
					exact: true,
				});

				if ((await toggle.count()) === 0) {
					continue;
				}

				await toggle.scrollIntoViewIfNeeded();
				if ((await toggle.getAttribute('aria-pressed')) !== 'true') {
					await toggle.click();
					await expect(toggle).toHaveAttribute('aria-pressed', 'true');
					hasChanges = true;
				}
			}

			if (hasChanges) {
				await expect(savePreferencesButton).toBeVisible();
				await savePreferencesButton.click();
				await expect(savePreferencesButton).toBeHidden({ timeout: 10000 });
			}

			await Promise.all([
				page.waitForURL(/summary/),
				page.getByRole('link', { name: 'Summary', exact: true }).click(),
			]);
		};

		await test.step('Step 6: Ensure macro indicator cards are enabled', async () => {
			await ensureMacroCardsEnabled();
			await expect(page).toHaveURL(/summary/);
		});

		const macroHeading = page.getByRole('heading', {
			name: /Macro Economic Indicators/i,
		});
		const macroCardHeader = page.getByRole('heading', {
			name: /^Macro Economic Indicators Key indicators with portfolio implications\. Read More$/i,
		});
		const macroCard = macroCardHeader.locator(
			'xpath=ancestor::*[.//*[@role="region"]][1]',
		);
		const macroDescription = page.getByText(
			'Key indicators with portfolio implications.',
			{ exact: true },
		);
		const macroRegion = macroCard.getByRole('region');
		const readMoreButton = macroCard.getByRole('button', {
			name: 'Read More',
			exact: true,
		});

		await test.step('Step 7: Verify the Macro Economic Indicators card content', async () => {
			await macroHeading.scrollIntoViewIfNeeded();
			await expect(macroHeading).toBeVisible();
			await expect(macroDescription).toBeVisible();
			await expect(macroRegion).toBeVisible();
			await expect(macroRegion).toContainText(/CPI/i);
			await expect(macroRegion).toContainText(/GDP/i);
			await expect(macroRegion).toContainText(/Unemployment Rate/i);
			await expect(macroRegion).toContainText(/CSI/i);
		});

		await test.step('Step 8: Open the macro indicators detail drawer and verify its content', async () => {
			await readMoreButton.click();

			const detailDrawer = page.getByRole('dialog').filter({
				has: page.getByText('Macro Economic Indicators', { exact: true }),
			});
			const detailTitle = detailDrawer.getByText(
				/The current economic indicators suggest a moderate recovery in the economy/i,
			);
			const detailDate = detailDrawer.getByText(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
			const sourceAttribution = detailDrawer.getByText(/Source:\s*FMP/i);
			const sourceLink = detailDrawer.getByRole('link', {
				name: /financialmodelingprep\.com/i,
			});

			await expect(detailDrawer).toBeVisible();
			await expect(detailTitle).toBeVisible();
			await expect(detailDate).toBeVisible();
			await expect(sourceAttribution).toBeVisible();
			await expect(sourceLink).toBeVisible();

			await detailDrawer.getByRole('button', { name: 'Close drawer' }).click();
			await expect(detailDrawer).not.toBeVisible();
			await expect(macroHeading).toBeVisible();
		});

		await test.step('Step 9: Log out', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
		});
	});
});
