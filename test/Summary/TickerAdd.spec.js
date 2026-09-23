const { test, expect } = require('@playwright/test');

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

    // Step 4: Capture the XLK row values.
    const researchTickerCell = page.getByText('XLK', { exact: true }).first();
    await expect(researchTickerCell).toBeVisible();

    const researchRow = researchTickerCell.locator('xpath=ancestor::tr[1]');
    const researchCells = researchRow.locator('td');
    const xlkTickerSymbol = (await researchCells.nth(1).innerText()).trim();
    const xlkStratzenScore = (await researchCells.nth(10).innerText()).trim();

    // Step 5: Open Summary and verify XLK.

  await page.getByRole('link', { name: 'Summary' }).click();
  await expect(page.getByRole('button', { name: 'Equity Market Outlook Market' })).toBeVisible();

  await page.waitForTimeout(5000);
  await page.getByText('XLK').click();
  await expect(page.getByText('XLK', { exact: true })).toBeVisible();
  await page.getByText('QA', { exact: true }).click();
  await page.getByRole('menuitem', { name: 'Preferences' }).click();
  await expect(page.getByRole('button', { name: 'Watchlist', exact: true })).toBeVisible();
  await expect(page.getByText('Stocks & ETFs', { exact: true })).toBeVisible(); 
  await expect(page.getByText('XLK', { exact: true })).toBeVisible();

  // removing the ticker from watchlist
  await page.getByRole('link', { name: 'Research' }).dblclick();
  await page.waitForURL('https://demoapp.stratzen.ai/research?watchlist_asset=stock&screener_asset=all&tab=watchlist');
  await page.getByRole('tab', { name: 'ETFs (2)' }).click();
  await page.getByText('★').first().click();

  // logout 

  await page.getByText('QA', { exact: true }).click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();

});
  });