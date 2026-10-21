import { test, expect } from '@playwright/test';
import {
  completeSignInWithOptionalOutlookSso,
  getTestData,
  installNativeDialogHandler,
  resilientLocator,
  safeClick,
  safeFill,
} from './mammothhai-playwright-helpers.js';

test.describe('Research and Summary - Add XLK Watchlist', () => {
  test.describe.configure({ timeout: 120000 });

  test('TC003_AddXLKAndVerifyAcrossPages', async ({ page }) => {

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
    const tickerSymbol = 'XLK';

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
    await expect(page.getByRole('button', { name: /add ticker/i })).toBeVisible();

    const openEtfWatchlist = async () => {
      await page.getByRole('link', { name: 'Research', exact: true }).click();
      await expect(page).toHaveURL(/\/research\?watchlist_asset=stock&screener_asset=all&tab=watchlist$/);
      await page.getByRole('tab', { name: /ETFs/i }).click();
      await expect(page).toHaveURL(/\/research\?watchlist_asset=etf&screener_asset=all&tab=watchlist$/);
      await expect(page.getByRole('button', { name: /add ticker/i })).toBeVisible();
    };

    const xlkResearchRow = page.getByRole('row').filter({ has: page.getByText('XLK', { exact: true }) });
    if (await xlkResearchRow.count()) {
      await xlkResearchRow.locator('td').first().click();
      await expect(xlkResearchRow).toHaveCount(0);
    }

    // Step 7: Add XLK to the ETF watchlist.
    let xlkAdded = false;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.getByRole('button', { name: /add ticker/i }).click();
      const tickerSymbolInput = page.getByRole('textbox', { name: 'Ticker Symbol' });
      await expect(tickerSymbolInput).toBeVisible();
      await tickerSymbolInput.fill(tickerSymbol);
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
        await page.waitForLoadState('networkidle');
        await openEtfWatchlist();
      }
    }

    expect(xlkAdded).toBeTruthy();

    // Step 8: Capture the XLK watchlist row details.
    const researchTickerCell = xlkResearchRow.getByText('XLK', { exact: true });
    await expect(researchTickerCell).toBeVisible();

    // Step 9: Open Summary and verify synchronized ticker visibility.
    await page.getByRole('link', { name: 'Summary', exact: true }).click();
    await expect(page).toHaveURL(/\/summary(?:[/?#]|$)/);
    await expect(page.getByRole('button', { name: 'Equity Market Outlook Market' })).toBeVisible();

    const summaryTicker = page.getByText(tickerSymbol, { exact: true }).first();
    await expect.poll(async () => await summaryTicker.count(), { timeout: 15000 }).toBeGreaterThan(0);
    await expect(summaryTicker).toBeVisible();

    await page.getByText('QA', { exact: true }).click();
    await page.getByRole('menuitem', { name: 'Preferences' }).click();
    await expect(page.getByRole('button', { name: 'Watchlist', exact: true })).toBeVisible();
    await expect(page.getByText('Stocks & ETFs', { exact: true })).toBeVisible();
    await expect(page.getByText(tickerSymbol, { exact: true })).toBeVisible();

    // Step 10: Remove XLK so the script remains repeatable.
    await openEtfWatchlist();
    await xlkResearchRow.locator('td').first().click();
    await expect(xlkResearchRow).toHaveCount(0);

    // Step 11: Logout from the application.
    await test.step('Step 11: Logout from the application', async () => {
      await page.getByText('QA', { exact: true }).click();
      await page.getByRole('menuitem', { name: 'Logout' }).click();
      await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
    });

  });
  });
