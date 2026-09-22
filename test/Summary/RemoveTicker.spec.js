const { test, expect } = require('@playwright/test');

test.describe('Research and Summary XLK Watchlist Removal', () => {
	test('TC004_RemoveXLKAndVerifyAcrossPages', async ({ page }) => {
		test.setTimeout(120000);

		const email = process.env.STRATZEN_EMAIL || 'SZ_AutoQA@stratzen.ai';
		const passwordValue = process.env.STRATZEN_PASSWORD || 'StratzenAutomation123';
		const tickerSymbol = 'XLK';

		await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
		await expect(page).toHaveURL(/login/);

		await page.locator('input[type="email"]').fill(email);
		await page.locator('input[type="password"]').fill(passwordValue);
		await page.getByRole('button', { name: /sign in/i }).click();
		await page.waitForLoadState('networkidle');
		await expect(page).not.toHaveURL(/login/);

		await page.getByRole('link', { name: 'Research', exact: true }).click();
		await expect(page).toHaveURL(/research/);
		await page.getByRole('tab', { name: 'Watchlist', exact: true }).click();
		await page.getByRole('tab', { name: /ETFs/i }).click();
		const addTickerButton = page.getByRole('button', { name: /add ticker/i });
		await expect(addTickerButton).toBeVisible();

		let xlkCell = page.getByText(tickerSymbol, { exact: true }).first();
		if ((await xlkCell.count()) === 0) {
			await addTickerButton.click();
			await page.getByRole('textbox', { name: 'Ticker Symbol' }).fill(tickerSymbol);
			await page.getByRole('button', { name: 'Add', exact: true }).click();
			xlkCell = page.getByText(tickerSymbol, { exact: true }).first();
		}

		await expect(xlkCell).toBeVisible();

		const xlkRow = xlkCell.locator('xpath=ancestor::tr[1]');
		const selectedStar = xlkRow.getByText('★').first();
		await expect(selectedStar).toBeVisible();

		await selectedStar.click();
		await expect(xlkCell).toHaveCount(0);

		await page.getByRole('link', { name: 'Summary', exact: true }).click();
		await page.waitForURL(/summary/);
		await page.waitForLoadState('networkidle');

		await expect(page.getByRole('button', { name: /Equity Market Outlook/i })).toBeVisible();
		const equitiesSection = page.getByText('EQUITIES', { exact: true }).first();
		await expect(equitiesSection).toBeVisible();
		await expect(page.getByText(tickerSymbol, { exact: true })).toHaveCount(0);

		await page.getByText('QA', { exact: true }).click();
		await page.getByRole('menuitem', { name: 'Preferences' }).click();
		await expect(page).toHaveURL(/preferences/);
		await expect(page.getByRole('button', { name: 'Watchlist', exact: true })).toBeVisible();
		await expect(page.getByText('Stocks & ETFs', { exact: true })).toBeVisible();
		await expect(page.getByText(tickerSymbol, { exact: true })).toHaveCount(0);

		await page.getByRole('link', { name: 'Summary', exact: true }).click();
		await page.waitForURL(/summary/);
		await page.waitForLoadState('networkidle');
		await page.reload({ waitUntil: 'networkidle' });
		await expect(equitiesSection).toBeVisible();
		await expect(page.getByText(tickerSymbol, { exact: true })).toHaveCount(0);
	});
});
