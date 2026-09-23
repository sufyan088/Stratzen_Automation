const { test, expect } = require('@playwright/test');

test.describe('Summary Module - Macro Economic Indicators', () => {
	async function ensureMacroCardsEnabled(page) {
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
	}

	test('TC_VerifyMacroEconomicIndicatorsDetailView', async ({ page }) => {
		test.setTimeout(90000);

		const email = 'SZ_AutoQA@stratzen.ai';
		const passwordValue = 'StratzenAutomation123';

		await page.goto('https://demoapp.stratzen.ai/login');
		await expect(page).toHaveURL(/login/);

		await page.locator('input[type="email"]').fill(email);
		await page.locator('input[type="password"]').fill(passwordValue);
		await page.getByRole('button', { name: /sign in/i }).click();

		await page.waitForURL('https://demoapp.stratzen.ai/summary');
		await ensureMacroCardsEnabled(page);

		const macroHeading = page.getByRole('heading', {
			name: /Macro Economic Indicators/i,
		});
		const macroDescription = page.getByText(
			'Key indicators with portfolio implications.',
			{ exact: true },
		);
		const macroRegion = page.getByRole('region').filter({
			hasText: /CPI/i,
		});
		const readMoreButton = page.getByRole('button', {
			name: 'Read More',
			exact: true,
		}).nth(1);

		await macroHeading.scrollIntoViewIfNeeded();
		await expect(macroHeading).toBeVisible();
		await expect(macroDescription).toBeVisible();
		await expect(macroRegion).toBeVisible();
		await expect(macroRegion).toContainText(/CPI/i);
		await expect(macroRegion).toContainText(/GDP/i);
		await expect(macroRegion).toContainText(/Unemployment Rate/i);
		await expect(macroRegion).toContainText(/CSI/i);

		await readMoreButton.click();

		const detailTitle = page.getByText('Macro Economic Indicators', { exact: true }).last();
		const detailDate = page.getByText(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
		const sourceAttribution = page.getByText(/Source:\s*FMP/i);
		const sourceLink = page.getByRole('link', {
			name: /site\.financialmodelingprep\.com/i,
		});

		await expect(detailTitle).toBeVisible();
		await expect(detailDate).toBeVisible();
		await expect(sourceAttribution).toBeVisible();
		await expect(sourceLink).toBeVisible();

		await page.getByRole('button', { name: 'Close drawer' }).last().click();

		await expect(detailDate).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'Summary', exact: true })).toBeVisible();
		await expect(macroHeading).toBeVisible();
	});
});
