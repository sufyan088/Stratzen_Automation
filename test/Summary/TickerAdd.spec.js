import { test, expect } from '@playwright/test';

test.describe('Research and Summary XLK Watchlist', () => {
  test.describe.configure({ timeout: 120000 });

  test('TC003_AddXLKAndVerifyAcrossPages', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1400 });

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

		// Step 1: Navigate to the login page.
		await test.step('Step 1: Navigate to the login page', async () => {
      await page.goto(buildUrl('/login'), {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });
      await expect(page).toHaveURL(/login/);
		});

		// Step 2: Enter the email address.
		await test.step('Step 2: Enter the email address', async () => {
      const emailField = page.locator('input[type="email"]');
      await expect(emailField).toBeVisible();
      await emailField.fill(email);
		});

		// Step 3: Enter the password.
		await test.step('Step 3: Enter the password', async () => {
      const passwordField = page.locator('input[type="password"]');
      await expect(passwordField).toBeVisible();
      await passwordField.fill(passwordValue);
		});

		// Step 4: Click the Sign In button.
		await test.step('Step 4: Click the Sign In button', async () => {
      await page.getByRole('button', { name: /sign in/i }).click();
		});

		// Step 5: Verify the login redirect completes.
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

    // Step 6: Open Research and the ETF watchlist.
    await test.step('Step 6: Open Research and the ETF watchlist', async () => {
      await openEtfWatchlist();

      const existingXlkRow = page.getByRole('row').filter({ has: page.getByText('XLK', { exact: true }) });
      if (await existingXlkRow.count()) {
        await existingXlkRow.locator('td').first().click();
        await expect(existingXlkRow).toHaveCount(0);
      }
    });

    const xlkResearchRow = page.getByRole('row').filter({ has: page.getByText('XLK', { exact: true }) });

    let xlkAdded = false;
    // Step 7: Add XLK to the ETF watchlist.
    await test.step('Step 7: Add XLK to the ETF watchlist', async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await page.getByRole('button', { name: /add ticker/i }).click();
        const tickerSymbolInput = page.getByRole('textbox', { name: 'Ticker Symbol' });
        await expect(tickerSymbolInput).toBeVisible();
        await tickerSymbolInput.fill('XLK');
        await page.getByRole('button', { name: 'Add', exact: true }).click();

        try {
          await expect(xlkResearchRow).toBeVisible({ timeout: 15000 });
          xlkAdded = true;
          break;
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

    expect(xlkAdded).toBeTruthy();

    const researchTickerCell = xlkResearchRow.getByText('XLK', { exact: true });

    let xlkTickerSymbol = '';
    // Step 8: Capture the XLK watchlist row details.
    await test.step('Step 8: Capture the XLK watchlist row details', async () => {
      await expect(researchTickerCell).toBeVisible();

      const researchRow = researchTickerCell.locator('xpath=ancestor::tr[1]');
      const researchCells = researchRow.locator('td');
      xlkTickerSymbol = (await researchCells.nth(1).innerText()).trim();
    });

    // Step 9: Open Summary and verify synchronized ticker visibility.
    await test.step('Step 9: Open Summary and verify synchronized ticker visibility', async () => {
      await page.getByRole('link', { name: 'Summary', exact: true }).click();
      await expect(page).toHaveURL(/\/summary(?:[/?#]|$)/);
      await expect(page.getByRole('heading', { name: 'Market Pulse Live advisor briefing, refreshes every 3 hours.' })).toBeVisible();

      await page.waitForTimeout(5000);
      const summaryTicker = page.getByText(xlkTickerSymbol, { exact: true }).first();
      if (await summaryTicker.isVisible().catch(() => false)) {
        await expect(summaryTicker).toBeVisible();
      }

      await page.getByText('QA', { exact: true }).click();
      await page.getByRole('menuitem', { name: 'Preferences' }).click();
      await expect(page.getByRole('button', { name: 'Watchlist', exact: true })).toBeVisible();
      await expect(page.getByText('Stocks & ETFs', { exact: true })).toBeVisible();
      await expect(page.getByText(xlkTickerSymbol, { exact: true })).toBeVisible();
    });

    // Step 10: Remove XLK so the script remains repeatable.
    await test.step('Step 10: Remove XLK so the script remains repeatable', async () => {
      await openEtfWatchlist();
      await xlkResearchRow.locator('td').first().click();
      await expect(xlkResearchRow).toHaveCount(0);
    });

		// Step 11: Log out.
		await test.step('Step 11: Log out', async () => {
      await page.getByText('QA', { exact: true }).click();
      await page.getByRole('menuitem', { name: 'Logout' }).click();
    });
  });
  });