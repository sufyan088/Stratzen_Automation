const { test, expect } = require('@playwright/test');

test.describe('RIA Module - List View', () => {
	test('TC_VerifyDefaultRiaTableColumnsAndRowPresentation', async ({ page }) => {
		test.setTimeout(90000);

		const email = 'SZ_AutoQA@stratzen.ai';
		const passwordValue = 'StratzenAutomation123';

		await page.goto('https://demoapp.stratzen.ai/login');
		await expect(page).toHaveURL(/login/);

		await page.locator('input[type="email"]').fill(email);
		await page.locator('input[type="password"]').fill(passwordValue);
		await page.getByRole('button', { name: /sign in/i }).click();

		await page.waitForURL('https://demoapp.stratzen.ai/summary');
		await page.getByRole('link', { name: 'RIAs', exact: true }).click();

		await expect(page).toHaveURL(/\/rias$/);

		const pageHeading = page.getByRole('heading', { name: 'Explore RIAs', exact: true });
		const savedFiltersControl = page.getByRole('button', {
			name: /saved filters/i,
		});
		const adBotControl = page.getByRole('button', { name: /open chat help/i });
		const adBotLabel = page.getByText('Ad-Bot', { exact: true });
		const riasTable = page.locator('table').first();
		const tableHeaders = riasTable.getByRole('columnheader');

		await expect(pageHeading).toBeVisible();
		await expect(page.locator('main')).toContainText(/find|compare|registered investment advisors/i);
		await expect(savedFiltersControl).toBeVisible();
		await expect(savedFiltersControl).toBeEnabled();
		await expect(adBotControl).toBeVisible();
		await expect(adBotLabel).toBeVisible();
		await expect(riasTable).toBeVisible();

		for (const [index, columnName] of [
			'CRD',
			'Business Name',
			'City',
			'State',
			'AUM',
			'Custodian',
			'Last Filing',
			'Actions',
		].entries()) {
			const headerCell = tableHeaders.nth(index);
			await expect(headerCell).toBeVisible();
			await expect(headerCell).toContainText(columnName);
		}

		const adBotBox = await adBotControl.boundingBox();
		const tableBox = await riasTable.boundingBox();
		if (!adBotBox || !tableBox) {
			throw new Error('Expected Ad-Bot control and RIAs table to have bounding boxes.');
		}
		expect(adBotBox.x).toBeGreaterThan(tableBox.x + tableBox.width / 2);
		expect(adBotBox.y + adBotBox.height).toBeLessThanOrEqual(tableBox.y + 20);
	});
});
