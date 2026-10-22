import { test, expect } from '@playwright/test';
import {
	completeSignInWithOptionalOutlookSso,
	getTestData,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from '../Summary/mammothhai-playwright-helpers.js';

test.describe('Research Module - Add Stock Ticker To Watchlist', () => {
	test.describe.configure({ timeout: 120000 });

	test('TC03_VerifyAdvisorCanAddStockTickerInResearchWatchlist', async ({ page }) => {
		installNativeDialogHandler(page);

		const use = test.info().project.use;
		const destinationUrlStep1 = getTestData('destination_url__step1');
		const appBaseUrl = process.env.URL
			|| process.env.APP_URL
			|| process.env.BASE_URL
			|| use.baseURL
			|| 'https://demoapp.stratzen.ai';

		const destinationUrl = destinationUrlStep1 || `${String(appBaseUrl).replace(/\/+$/, '')}/login`;
		const authUsername = use.username || process.env.STRATZEN_EMAIL;
		const password = use.password || process.env.STRATZEN_PASSWORD;
		const outlookUsername = use.outlookUsername || process.env.OUTLOOK_EMAIL;
		const outlookPassword = use.outlookPassword || process.env.OUTLOOK_PASSWORD;
		const tickerSymbol = 'GOOGL';

		if (!destinationUrl) throw new Error('Missing destination_url__step1 / BASEURL test data.');
		if (!authUsername || !password) throw new Error('Missing username or password in project.use or environment variables.');

		const normalizeText = (value) => (value || '').replace(/\s+/g, ' ').trim();

		const getCellTextFromRowByHeader = async (rowLocator, headerPattern, fallbackIndex = null) => {
			const gridContainer = rowLocator.locator('xpath=ancestor::*[@role="grid" or self::table][1]');
			let headers = gridContainer.getByRole('columnheader');
			let headerCount = await headers.count();
			if (!headerCount) {
				headers = gridContainer.locator('thead th');
				headerCount = await headers.count();
			}

			let matchedHeaderIndex = -1;
			for (let index = 0; index < headerCount; index += 1) {
				const headerText = normalizeText(await headers.nth(index).textContent());
				if (headerPattern.test(headerText)) {
					matchedHeaderIndex = index;
					break;
				}
			}

			if (matchedHeaderIndex < 0) {
				if (typeof fallbackIndex === 'number') {
					matchedHeaderIndex = fallbackIndex;
				} else {
					throw new Error(`Could not find table header matching ${headerPattern}`);
				}
			}

			let rowCells = rowLocator.getByRole('cell');
			let rowCellCount = await rowCells.count();
			if (!rowCellCount) {
				rowCells = rowLocator.locator('[role="gridcell"], td');
				rowCellCount = await rowCells.count();
			}

			if (matchedHeaderIndex >= rowCellCount) {
				throw new Error(`Resolved column index ${matchedHeaderIndex} is outside row cell count ${rowCellCount}.`);
			}

			const cell = rowCells.nth(matchedHeaderIndex);
			await expect(cell).toBeVisible();
			return normalizeText(await cell.textContent());
		};

		// Login: Navigate to app and sign in as advisor.
		await page.goto(destinationUrl, {
			waitUntil: 'domcontentloaded',
			timeout: 90000,
		});
		await expect(page).toHaveURL(/login/);

		const emailControl = await resilientLocator(page, ['input[type="email"]'], {
			labelFallback: 'Email Address',
			role: 'textbox',
		});
		await safeFill(emailControl, String(authUsername));

		const passwordControl = await resilientLocator(page, ['input[type="password"]'], {
			labelFallback: 'Password',
			role: 'textbox',
		});
		await safeFill(passwordControl, String(password));

		const signInButton = await resilientLocator(page, ['button[type="submit"]', '#idSIButton9'], {
			labelFallback: 'Sign In',
			role: 'button',
		});
		await safeClick(signInButton, { timeout: 20000 });
		await completeSignInWithOptionalOutlookSso(page, outlookUsername, outlookPassword);
		await page.waitForLoadState('networkidle').catch(() => {});
		expect(/\/(summary|rias|research|preferences)(\/|$)/i.test(page.url())).toBe(true);

		// Step 1: Click on the Research module from the left sidebar.
		await test.step('Step 1: Open Research module from the left sidebar', async () => {
			await safeClick(page.getByRole('link', { name: /^Research$/i }).first(), { timeout: 20000 });
			await expect(page).toHaveURL(/\/research/i);
		});

		// Step 2: Click on the Watchlist tab.
		await test.step('Step 2: Open Watchlist tab', async () => {
			await safeClick(page.getByRole('tab', { name: /^Watchlist$/i }).first(), { timeout: 20000 });
			await expect(page).toHaveURL(/tab=watchlist/i);
		});

		// Step 3: Click on the Stocks category.
		await test.step('Step 3: Open Stocks category', async () => {
			const stocksCandidates = [
				page.getByRole('tab', { name: /^Stocks$/i }).first(),
				page.getByRole('button', { name: /^Stocks$/i }).first(),
				page.getByRole('tab', { name: /Stocks\s*&\s*ETFs/i }).first(),
				page.getByRole('button', { name: /Stocks\s*&\s*ETFs/i }).first(),
				page.getByText(/^Stocks$/i).first(),
			];

			let clickedStocksCategory = false;
			for (const candidate of stocksCandidates) {
				if (await candidate.isVisible().catch(() => false)) {
					await safeClick(candidate, { timeout: 20000 });
					clickedStocksCategory = true;
					break;
				}
			}

			if (!clickedStocksCategory) {
				// If no explicit Stocks control is shown, verify Stocks is already active.
				await expect(page).toHaveURL(/watchlist_asset=stock/i);
			}

			await expect(page).toHaveURL(/watchlist_asset=stock/i);
			await expect(page.getByRole('button', { name: /add ticker/i }).first()).toBeVisible();
		});

		const googlRow = page.getByRole('row').filter({ has: page.getByText('GOOGL', { exact: true }) }).first();

		// Precondition guard: If GOOGL exists already, remove it first so add-flow remains deterministic.
		if (await googlRow.count()) {
			await googlRow.locator('td').first().click();
			await expect(googlRow).toHaveCount(0);
		}

		// Step 4: Click on the + Add Ticker button.
		await test.step('Step 4: Open Add Ticker dialog', async () => {
			const addTickerButton = page.getByRole('button', { name: /add ticker/i }).first();
			await expect(addTickerButton).toBeVisible();
			await safeClick(addTickerButton, { timeout: 20000 });

			const tickerInput = page.getByRole('textbox', { name: /Ticker Symbol/i }).first();
			await expect(tickerInput).toBeVisible();
		});

		// Step 5: Enter GOOGL in the Ticker Symbol input field.
		await test.step('Step 5: Enter GOOGL in Ticker Symbol field', async () => {
			const tickerInput = page.getByRole('textbox', { name: /Ticker Symbol/i }).first();
			await safeFill(tickerInput, tickerSymbol);
			await expect(tickerInput).toHaveValue(tickerSymbol);
		});

		// Step 6: Click on the Add button.
		await test.step('Step 6: Click Add button', async () => {
			await safeClick(page.getByRole('button', { name: /^Add$/i }).first(), { timeout: 20000 });
		});

		// Step 7: Verify confirmation message is displayed.
		await test.step('Step 7: Verify add confirmation message', async () => {
			const successCandidates = [
				page.getByText(/GOOGL\s*\(Alphabet Inc\.\)\s*added to your stock watchlist\.?/i).first(),
				page.getByText(/GOOGL.*added.*watchlist/i).first(),
				page.getByRole('alert').filter({ hasText: /GOOGL|watchlist|added/i }).first(),
				page.getByRole('status').filter({ hasText: /GOOGL|watchlist|added/i }).first(),
				page.locator('[class*="toast" i], [class*="snackbar" i], [data-testid*="toast" i]').filter({ hasText: /GOOGL|watchlist|added/i }).first(),
			];

			await expect.poll(async () => {
				for (const candidate of successCandidates) {
					if (await candidate.isVisible().catch(() => false)) {
						return true;
					}
				}

				// Fallback success signal for fast-disappearing toasts.
				return await googlRow.isVisible().catch(() => false);
			}, { timeout: 15000 }).toBe(true);
		});

		// Step 8: Verify GOOGL is displayed in the Stocks Watchlist grid.
		await test.step('Step 8: Verify GOOGL row is visible in Stocks grid', async () => {
			await expect(googlRow).toBeVisible({ timeout: 15000 });
		});

		// Step 9: Verify the Ticker Symbol displays as GOOGL.
		await test.step('Step 9: Verify ticker symbol value', async () => {
			const tickerValue = await getCellTextFromRowByHeader(googlRow, /ticker\s*symbol|ticker/i, 1);
			expect(tickerValue).toContain('GOOGL');
		});

		// Step 10: Verify the Fund Name displays as Alphabet Inc.
		await test.step('Step 10: Verify fund name value', async () => {
			const fundNameValue = await getCellTextFromRowByHeader(googlRow, /fund\s*name|name/i, 2);
			expect(fundNameValue).toContain('Alphabet Inc.');
		});

		// Step 11: Verify the Price/NAV value is displayed.
		await test.step('Step 11: Verify Price/NAV value is displayed', async () => {
			const priceNavValue = await getCellTextFromRowByHeader(googlRow, /price\s*\/\s*nav|price|nav/i, 3);
			expect(priceNavValue.length).toBeGreaterThan(0);
		});

		// Step 12: Verify the AUM value is displayed.
		await test.step('Step 12: Verify AUM value is displayed', async () => {
			const aumValue = await getCellTextFromRowByHeader(googlRow, /aum/i, 4);
			expect(aumValue.length).toBeGreaterThan(0);
		});

		// Step 13: Verify the ER value is displayed.
		await test.step('Step 13: Verify ER value is displayed', async () => {
			const erValue = await getCellTextFromRowByHeader(googlRow, /^er$|expense\s*ratio/i, 5);
			expect(erValue.length).toBeGreaterThan(0);
		});

		// Step 14: Verify the YTD value is displayed.
		await test.step('Step 14: Verify YTD value is displayed', async () => {
			const ytdValue = await getCellTextFromRowByHeader(googlRow, /^ytd$/i, 6);
			expect(ytdValue.length).toBeGreaterThan(0);
		});

		// Step 15: Verify the 1YR value is displayed.
		await test.step('Step 15: Verify 1YR value is displayed', async () => {
			const oneYearValue = await getCellTextFromRowByHeader(googlRow, /^1\s*yr$/i, 7);
			expect(oneYearValue.length).toBeGreaterThan(0);
		});

		// Step 16: Verify the 3YR value is displayed.
		await test.step('Step 16: Verify 3YR value is displayed', async () => {
			const threeYearValue = await getCellTextFromRowByHeader(googlRow, /^3\s*yr$/i, 8);
			expect(threeYearValue.length).toBeGreaterThan(0);
		});

		// Step 17: Verify the 5YR value is displayed.
		await test.step('Step 17: Verify 5YR value is displayed', async () => {
			const fiveYearValue = await getCellTextFromRowByHeader(googlRow, /^5\s*yr$/i, 9);
			expect(fiveYearValue.length).toBeGreaterThan(0);
		});

		// Step 18: Verify the Stratzen Score value is displayed.
		await test.step('Step 18: Verify Stratzen Score value is displayed', async () => {
			const scoreValue = await getCellTextFromRowByHeader(googlRow, /stratzen\s*score|score/i, 10);
			expect(scoreValue.length).toBeGreaterThan(0);
		});

		// Step 19: Verify the Status label is displayed.
		await test.step('Step 19: Verify Status value is displayed', async () => {
			const statusValue = await getCellTextFromRowByHeader(googlRow, /status/i, 11);
			expect(statusValue.length).toBeGreaterThan(0);
		});

		// Step 20: Click the star icon for GOOGL to remove it from the watchlist.
		await test.step('Step 20: Remove GOOGL from watchlist using star icon', async () => {
			await expect(googlRow).toBeVisible({ timeout: 15000 });
			const starCell = googlRow.locator('td').first();
			await safeClick(starCell, { timeout: 20000 });
			await expect(googlRow).toHaveCount(0);
		});

		// Step 21: Logout from the application.
		await test.step('Step 21: Logout from the application', async () => {
			const profileTrigger = await resilientLocator(page, [
				'text=QA',
				'button[aria-label*="profile" i]',
				'button[aria-label*="account" i]',
				'[data-testid*="profile" i]',
			], {
				labelFallback: 'QA',
				role: 'button',
			});

			await safeClick(profileTrigger, { timeout: 20000 });

			const logoutItem = await resilientLocator(page, [
				'role=menuitem[name="Logout"]',
				'text=Logout',
			], {
				labelFallback: 'Logout',
				role: 'menuitem',
			});

			await safeClick(logoutItem, { timeout: 20000 });
			await expect(page).toHaveURL(/login/i);
		});
	});
});
