import { test, expect } from '@playwright/test';
import {
	completeSignInWithOptionalOutlookSso,
	getTestData,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from './mammothhai-playwright-helpers.js';

test.describe('Research and Summary - Remove XLK Watchlist', () => {
	test.describe.configure({ timeout: 120000 });

	test('TC004_RemoveXLKAndVerifyAcrossPages', async ({ page }) => {

	installNativeDialogHandler(page);
	const use = test.info().project.use;
	const destinationUrlStep1 = getTestData('destination_url__step1');

	const appBaseUrl = process.env.URL
		|| process.env.APP_URL
		|| process.env.BASE_URL
		|| use.baseURL;
	const destinationUrl = destinationUrlStep1 || `${String(appBaseUrl).replace(/\/+$/, '')}/login`;
	const authUsername = use.username || process.env.STRATZEN_EMAIL;
	const password = use.password || process.env.STRATZEN_PASSWORD;
	const outlookUsername = use.outlookUsername || process.env.OUTLOOK_EMAIL;
	const outlookPassword = use.outlookPassword || process.env.OUTLOOK_PASSWORD;

	if (!destinationUrl) throw new Error('Missing destination_url__step1 / BASEURL test data.');
	if (!authUsername || !password) throw new Error('Missing username or password in project.use or environment variables.');

	// Step 1: Navigate to the login page.
	await page.goto(destinationUrl, {
		waitUntil: 'domcontentloaded',
		timeout: 90000,
	});
	await expect(page).toHaveURL(/login/);

	// Step 2: Enter the email address.
	const emailField = await resilientLocator(page, ['input[type="email"]'], { labelFallback: 'Email Address', role: 'textbox' });
	await safeFill(emailField, String(authUsername));
	await expect(page.locator('input[type="email"]').first()).toHaveValue(String(authUsername));

	// Step 3: Enter the password.
	const passwordField = await resilientLocator(page, ['input[type="password"]'], { labelFallback: 'Password', role: 'textbox' });
	await safeFill(passwordField, String(password));
	await expect(page.locator('input[type="password"]').first()).toHaveValue(String(password));

	// Step 4: Click the Sign In button.
	const signInButton = await resilientLocator(page, ['button[type="submit"]'], { labelFallback: 'Sign In', role: 'button' });
	await safeClick(signInButton, { timeout: 15000 });
	await completeSignInWithOptionalOutlookSso(page, outlookUsername, outlookPassword);

	// Step 5: Verify the login redirect completes.
	await page.waitForLoadState('networkidle');
	await expect(page).toHaveURL(/\/(summary|rias|research|preferences)(?:[/?#]|$)/);


	// Step 6: Open Research and the ETF watchlist.
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

	// Step 7: Add XLK to the ETF watchlist.
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

	// Step 8: Verify XLK shows as selected in the watchlist.
	await expect(xlkRow).toBeVisible();

	const xlkStar = xlkRow.locator('td').first().locator('span').first();
	await expect(xlkStar).toHaveText('â˜…');
	await expect(xlkStar).toHaveCSS('color', 'rgb(245, 158, 11)');

	// Step 9: Remove XLK from the ETF watchlist.
	await xlkRow.locator('td').first().click();

	// Step 10: Verify XLK is removed from the watchlist and synced in Summary.
	await expect(xlkRow).toHaveCount(0);

	await page.getByRole('link', { name: 'Summary' }).click();
    await expect(page.getByRole('button', { name: 'Equity Market Outlook Market' })).toBeVisible();

	const summaryXlkMatches = page.getByText('XLK', { exact: true });
	await expect
		.poll(async () => {
			const matchCount = await summaryXlkMatches.count();
			for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
				if (await summaryXlkMatches.nth(matchIndex).isVisible().catch(() => false)) {
					return 1;
				}
			}

			return 0;
		}, { timeout: 15000 })
		.toBe(0);

	await page.getByText('QA', { exact: true }).click();
    await page.getByRole('menuitem', { name: 'Preferences' }).click();
    await expect(page.getByRole('button', { name: 'Watchlist', exact: true })).toBeVisible();
    await expect(page.getByText('Stocks & ETFs', { exact: true })).toBeVisible(); 

	const preferencesXlkMatches = page.getByText('XLK', { exact: true });
	await expect
		.poll(async () => {
			const matchCount = await preferencesXlkMatches.count();
			for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
				if (await preferencesXlkMatches.nth(matchIndex).isVisible().catch(() => false)) {
					return 1;
				}
			}

			return 0;
		}, { timeout: 15000 })
		.toBe(0);

	// Step 11: Logout from the application.
	await test.step('Step 11: Logout from the application', async () => {
		await page.getByText('QA', { exact: true }).click();
		await page.getByRole('menuitem', { name: 'Logout' }).click();
		await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
	});

});
  });
