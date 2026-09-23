import { test, expect } from '@playwright/test';

test.describe('Research and Summary XLK Watchlist', () => {
	test.describe.configure({ timeout: 120000 });

  test('TC003_AddXLKAndVerifyAcrossPages', async ({ page }) => {
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

	// Step 1: Open the app and sign in.
	await page.goto(buildUrl('/login'));
	await expect(page).toHaveURL(/login/);
	await page.locator('input[type="email"]').fill(email);
	await page.locator('input[type="password"]').fill(passwordValue);
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForLoadState('networkidle');
	await expect(page).toHaveURL(/\/summary(?:[/?#]|$)/);


	// Step 2: Open Research and the Watchlist ETF tab.
	await page.getByRole('link', { name: 'Research', exact: true }).click();
	await expect(page).toHaveURL(/\/research\?watchlist_asset=stock&screener_asset=all&tab=watchlist$/);
	await page.getByRole('tab', { name: 'Watchlist', exact: true }).click();
	await page.getByRole('tab', { name: /ETFs/i }).click();
	await expect(page).toHaveURL(/\/research\?watchlist_asset=etf&screener_asset=all&tab=watchlist$/);

	const openEtfWatchlist = async () => {
		await page.getByRole('link', { name: 'Research', exact: true }).click();
		await expect(page).toHaveURL(/\/research\?watchlist_asset=stock&screener_asset=all&tab=watchlist$/);
		await page.getByRole('tab', { name: /ETFs/i }).click();
		await expect(page).toHaveURL(/\/research\?watchlist_asset=etf&screener_asset=all&tab=watchlist$/);
	};

	// Step 3: Add XLK.
	const xlkRow = page.getByRole('row', { name: /XLK State Street Technology Select Sector SPDR ETF/i });
	let xlkAdded = false;
	for (let attempt = 0; attempt < 2; attempt += 1) {
		await page.getByRole('button', { name: /add ticker/i }).click();
		const tickerSymbolInput = page.getByRole('textbox', { name: 'Ticker Symbol' });
		await expect(tickerSymbolInput).toBeVisible();
		await tickerSymbolInput.fill('XLK');
		await page.getByRole('button', { name: 'Add', exact: true }).click();

		try {
			await expect(xlkRow).toBeVisible({ timeout: 15000 });
			xlkAdded = true;
			break;
		} catch (error) {
			if (attempt === 1) {
				throw error;
			}

			await page.reload({ waitUntil: 'domcontentloaded' });
			await page.waitForLoadState('networkidle');
			await openEtfWatchlist();
		}
	}

	expect(xlkAdded).toBeTruthy();

	// Step 4: Verify XLK shows as selected in the watchlist.
	await expect(xlkRow).toBeVisible();

	const xlkStar = xlkRow.locator('td').first().locator('span').first();
	await expect(xlkStar).toHaveText('★');
	await expect(xlkStar).toHaveCSS('color', 'rgb(245, 158, 11)');

	await xlkRow.locator('td').first().click();

	await expect(xlkRow).toHaveCount(0);

	await page.getByRole('link', { name: 'Summary' }).click();
    await expect(page.getByRole('button', { name: 'Equity Market Outlook Market' })).toBeVisible();

    await page.waitForTimeout(5000);
    await expect(page.getByText('XLK', { exact: true })).toHaveCount(0);

	await page.getByText('QA', { exact: true }).click();
    await page.getByRole('menuitem', { name: 'Preferences' }).click();
    await expect(page.getByRole('button', { name: 'Watchlist', exact: true })).toBeVisible();
    await expect(page.getByText('Stocks & ETFs', { exact: true })).toBeVisible(); 
	await expect(page.getByText('XLK', { exact: true })).toHaveCount(0);

	  // logout 

    await page.getByText('QA', { exact: true }).click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();

});
  });