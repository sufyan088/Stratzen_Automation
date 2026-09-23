const { test, expect } = require('@playwright/test');

<<<<<<< HEAD
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
=======
test.describe('Research and Summary XLK Watchlist', () => {
  test('TC003_AddXLKAndVerifyAcrossPages', async ({ page }) => {
	const email = 'SZ_AutoQA@stratzen.ai';
	const passwordValue = 'StratzenAutomation123';

	// Step 1: Open the app and sign in.
	await page.goto('https://demoapp.stratzen.ai/login');
	await expect(page).toHaveURL(/login/);
	await page.locator('input[type="email"]').fill(email);
	await page.locator('input[type="password"]').fill(passwordValue);
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL('https://demoapp.stratzen.ai/summary');


	// Step 2: Open Research and the Watchlist ETF tab.
	await page.getByRole('link', { name: 'Research', exact: true }).click();
	await expect(page).toHaveURL('https://demoapp.stratzen.ai/research?watchlist_asset=stock&screener_asset=all&tab=watchlist');
	await page.getByRole('tab', { name: 'Watchlist', exact: true }).click();
	await page.getByRole('tab', { name: /ETFs/i }).click();

	// Step 3: Add XLK.
	await page.getByRole('button', { name: /add ticker/i }).click();
	await page.getByRole('textbox', { name: 'Ticker Symbol' }).fill('XLK');
	await page.getByRole('button', { name: 'Add', exact: true }).click();
	await page.getByText('XLK', { exact: true }).waitFor({ state: 'visible', timeout: 50000 });

	// Step 4: Verify XLK shows as selected in the watchlist.
	const xlkRow = page.getByRole('row', { name: /XLK State Street Technology Select Sector SPDR ETF/i });
	await expect(xlkRow).toBeVisible();

	const xlkStar = xlkRow.locator('td').first().locator('span').first();
	await expect(xlkStar).toHaveText('★');
	await expect(xlkStar).toHaveCSS('color', 'rgb(245, 158, 11)');

	await page.getByText('★').first().click();

	const researchTickerCell = page.getByText('XLK', { exact: true }).first();
    await expect(researchTickerCell).not.toBeVisible();

	await page.getByRole('link', { name: 'Summary' }).click();
    await expect(page.getByRole('button', { name: 'Equity Market Outlook Market' })).toBeVisible();

    await page.waitForTimeout(5000);
    await expect(page.getByText('XLK', { exact: true })).not.toBeVisible();

	await page.getByText('QA', { exact: true }).click();
    await page.getByRole('menuitem', { name: 'Preferences' }).click();
    await expect(page.getByRole('button', { name: 'Watchlist', exact: true })).toBeVisible();
    await expect(page.getByText('Stocks & ETFs', { exact: true })).toBeVisible(); 
    await expect(page.getByText('XLK', { exact: true })).not.toBeVisible();

});
  });
>>>>>>> cc03721fc97a82c2dd0901dc467de70a9593a319
