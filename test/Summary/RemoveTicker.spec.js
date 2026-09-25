import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test.describe('Research and Summary XLK Watchlist', () => {
	test('TC004_RemoveXLKAndVerifyAcrossPages', async ({ page }) => {
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
		const tickerSymbol = 'XLK';

		await test.step('Step 1: Navigate to the login page', async () => {
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

		const openEtfWatchlist = async () => {
			await page.getByRole('link', { name: 'Research', exact: true }).click();
			await expect(page).toHaveURL(/\/research(?:\?watchlist_asset=(?:stock|etf)&screener_asset=all&tab=watchlist)?$/);

			if (!/watchlist_asset=etf/.test(page.url())) {
				await page.getByRole('tab', { name: /ETFs/i }).click();
			}

			await expect(page).toHaveURL(/\/research\?watchlist_asset=etf&screener_asset=all&tab=watchlist$/);
		};

		const xlkRow = () => page.getByRole('row', {
			name: /XLK State Street Technology Select Sector SPDR ETF/i,
		});

		await test.step('Step 6: Open Research and the ETF watchlist', async () => {
			await openEtfWatchlist();
		});

		await test.step('Step 7: Ensure XLK exists in the ETF watchlist', async () => {
			if ((await xlkRow().count()) > 0) {
				await expect(xlkRow()).toBeVisible();
				return;
			}

			for (let attempt = 0; attempt < 2; attempt += 1) {
				await page.getByRole('button', { name: /add ticker/i }).click();
				const tickerSymbolInput = page.getByRole('textbox', { name: 'Ticker Symbol' });
				await expect(tickerSymbolInput).toBeVisible();
				await tickerSymbolInput.fill(tickerSymbol);
				await page.getByRole('button', { name: 'Add', exact: true }).click();

				try {
					await expect(xlkRow()).toBeVisible({ timeout: 15000 });
					return;
				} catch (error) {
					if (attempt === 1) {
						throw error;
					}

					await page.reload({ waitUntil: 'domcontentloaded' });
					await expect(page.getByRole('link', { name: 'Research', exact: true })).toBeVisible();
					await openEtfWatchlist();
				}
			}
		});

		await test.step('Step 8: Remove XLK and verify it is removed across pages', async () => {
			await expect(xlkRow()).toBeVisible();

			const starToggle = xlkRow().locator('td').first().locator('span').first();
			await expect(starToggle).toHaveText('★');
			await starToggle.click();
			await expect(xlkRow()).toHaveCount(0);

			await page.getByRole('link', { name: 'Summary', exact: true }).click();
			await expect(page).toHaveURL(/\/summary(?:[/?#]|$)/);
			await page.waitForLoadState('networkidle');
			await expect(page.getByRole('heading', { name: 'Market Pulse Live advisor briefing, refreshes every 3 hours.' })).toBeVisible();
			await expect(page.getByText(tickerSymbol, { exact: true })).toHaveCount(0);

			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Preferences' }).click();
			await expect(page).toHaveURL(/preferences/);
			await expect(page.getByRole('button', { name: 'Watchlist', exact: true })).toBeVisible();
			await expect(page.getByText('Stocks & ETFs', { exact: true })).toBeVisible();
			await expect(page.getByText(tickerSymbol, { exact: true })).toHaveCount(0);

			await page.getByRole('link', { name: 'Summary', exact: true }).click();
			await expect(page).toHaveURL(/\/summary(?:[/?#]|$)/);
			await page.waitForLoadState('networkidle');
			await page.reload({ waitUntil: 'networkidle' });
			await expect(page.getByRole('heading', { name: 'Market Pulse Live advisor briefing, refreshes every 3 hours.' })).toBeVisible();
			await expect(page.getByText(tickerSymbol, { exact: true })).toHaveCount(0);
		});

		await test.step('Step 9: Log out', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
		});
	});
});
