const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Search Filters', () => {
	test('TC_VerifyColumnSearchFieldsAreAvailableAndFunctional', async ({ page }) => {
		test.setTimeout(90000);

		const email = 'SZ_AutoQA@stratzen.ai';
		const passwordValue = 'StratzenAutomation123';
		const targetCrd = '147746';
		const businessNameFragment = 'HARTFORD FUNDS';

		await page.goto('https://demoapp.stratzen.ai/login');
		await expect(page).toHaveURL(/login/);

		await page.locator('input[type="email"]').fill(email);
		await page.locator('input[type="password"]').fill(passwordValue);
		await page.getByRole('button', { name: /sign in/i }).click();


		await page.waitForURL('https://demoapp.stratzen.ai/summary');
		await page.getByRole('link', { name: 'RIAs', exact: true }).click();
		await expect(page).toHaveURL(/\/rias$/);

		const riasTable = page.locator('table').first();
		const headerCells = riasTable.getByRole('columnheader');
		const dataRows = riasTable.locator('tbody tr');
		const crdHeader = headerCells.nth(0);
		const businessNameHeader = headerCells.nth(1);
		const crdFilter = crdHeader.getByRole('textbox', { name: /filter by crd/i });
		const businessNameFilter = businessNameHeader.getByRole('textbox', {
			name: /filter by business name/i,
		});

		await expect(riasTable).toBeVisible();
		await expect(crdFilter).toBeVisible();

		const initialRowCount = await dataRows.count();
		expect(initialRowCount).toBeGreaterThan(1);

		await crdFilter.fill(targetCrd);
		await expect(dataRows).toHaveCount(1);
		await expect(dataRows.first().locator('td').nth(0)).toHaveText(targetCrd);

		await crdFilter.clear();
		await expect(crdFilter).toHaveValue('');
		await expect(dataRows).not.toHaveCount(1);
		expect(await dataRows.count()).toBeGreaterThan(1);

		await expect(businessNameFilter).toBeVisible();
		await businessNameFilter.fill(businessNameFragment);
		await expect(dataRows).toHaveCount(1);
		await expect(dataRows.first().locator('td').nth(1)).toContainText(businessNameFragment);

		await businessNameFilter.clear();
		await expect(businessNameFilter).toHaveValue('');
		await expect(dataRows).not.toHaveCount(1);
		expect(await dataRows.count()).toBeGreaterThan(1);
	});
});
