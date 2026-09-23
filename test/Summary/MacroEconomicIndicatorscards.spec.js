const { test, expect } = require('@playwright/test');

test.describe('Summary Module - Macro Economic Indicators', () => {
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

		const macroHeading = page.getByRole('heading', {
			name: /Macro Economic Indicators/i,
		});
		const macroSection = macroHeading.locator('..');
		const macroDescription = page.getByText(
			'Key indicators with portfolio implications.',
			{ exact: true },
		);
		const readMoreButton = macroSection.getByRole('button', {
			name: 'Read More',
			exact: true,
		});

		await macroHeading.scrollIntoViewIfNeeded();
		await expect(macroHeading).toBeVisible();
		await expect(macroDescription).toBeVisible();

		const fedFundsCard = page.getByText('FED FUNDS RATE', { exact: true });
		const cpiCard = page.getByText('CPI', { exact: true });
		const unemploymentCard = page.getByText('UNEMPLOYMENT RATE (U3)', {
			exact: true,
		});
		const csiCard = page.getByText('CSI', { exact: true });

		await expect(fedFundsCard).toBeVisible();
		await expect(cpiCard).toBeVisible();
		await expect(unemploymentCard).toBeVisible();
		await expect(csiCard).toBeVisible();

		const fedFundsValue = (await macroSection.getByText(/^3\.72%$/).textContent()).trim();
		const cpiValue = (await macroSection.getByText(/^2\.23%$/).textContent()).trim();
		const unemploymentValue = (await macroSection.getByText(/^4\.4%$/).textContent()).trim();

		await readMoreButton.click();

		const detailTitle = page.getByText('Macro Economic Indicators', { exact: true }).last();
		const detailDate = page.getByText(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
		const detailNarrative = page.locator('body');
		const sourceAttribution = page.getByText(/Source:\s*FMP/i);
		const sourceLink = page.getByRole('link', {
			name: /site\.financialmodelingprep\.com/i,
		});

		await expect(detailTitle).toBeVisible();
		await expect(detailDate).toBeVisible();
		await expect(detailNarrative).toContainText(fedFundsValue);
		await expect(detailNarrative).toContainText(cpiValue);
		await expect(detailNarrative).toContainText(unemploymentValue);
		await expect(sourceAttribution).toBeVisible();
		await expect(sourceLink).toBeVisible();

		await page.getByRole('button', { name: 'Close drawer' }).last().click();

		await expect(detailDate).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'Summary', exact: true })).toBeVisible();
		await expect(macroHeading).toBeVisible();
	});
});
