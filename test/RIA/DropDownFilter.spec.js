const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Dropdown Filters', () => {
	test('TC_VerifyStateFilterDropdownAndSelection', async ({ page }) => {
		test.setTimeout(90000);

		const email = 'SZ_AutoQA@stratzen.ai';
		const passwordValue = 'StratzenAutomation123';
		const targetState = 'New York';

		await page.goto('https://demoapp.stratzen.ai/login');
		await expect(page).toHaveURL(/login/);

		await page.locator('input[type="email"]').fill(email);
		await page.locator('input[type="password"]').fill(passwordValue);
		await page.getByRole('button', { name: /sign in/i }).click();

		await page.waitForURL('https://demoapp.stratzen.ai/summary');
		await page.getByRole('link', { name: 'RIAs', exact: true }).click();
		await expect(page).toHaveURL(/\/rias$/);

		const getRiasTable = () => page.locator('table').first();
		const getDataRows = () => getRiasTable().locator('tbody tr');
		const getStateHeader = () => getRiasTable().getByRole('columnheader').nth(3);
		const getStateFilterControl = () => getStateHeader().getByRole('combobox');
		const getStateFilterList = () => page.getByRole('listbox').last();
		const getTargetStateOption = () =>
			getStateFilterList().getByRole('option', {
				name: /New York \(NY\)/i,
			});
		const getTargetStateCheckbox = () => getTargetStateOption().getByRole('checkbox');

		await expect(getRiasTable()).toBeVisible();
		expect(await getDataRows().count()).toBeGreaterThan(1);

		await expect(getStateFilterControl()).toBeVisible();
		await getStateFilterControl().click();

		await expect(getStateFilterList()).toBeVisible();
		await expect(getTargetStateOption()).toBeVisible();

		await getTargetStateCheckbox().click();
		await expect(getTargetStateCheckbox()).toBeChecked();
		await expect(getDataRows().first()).toBeVisible();
		await expect(getDataRows()).not.toHaveCount(0);
		const filteredRowCount = await getDataRows().count();
		expect(filteredRowCount).toBeGreaterThan(0);

		for (let index = 0; index < filteredRowCount; index += 1) {
			await expect(getDataRows().nth(index).locator('td').nth(3)).toHaveText(targetState);
		}

		if (!(await getStateFilterList().isVisible())) {
			await expect(getStateFilterControl()).toBeVisible();
			await getStateFilterControl().click();
		}
		await expect(getStateFilterList()).toBeVisible();
		await expect(getTargetStateOption()).toBeVisible();
		await expect(getTargetStateCheckbox()).toBeChecked();

		await getTargetStateCheckbox().click();
		await expect(getTargetStateCheckbox()).not.toBeChecked();
		await expect(getDataRows().first()).toBeVisible();
		await expect(getDataRows()).not.toHaveCount(0);

		const clearedRowCount = await getDataRows().count();
		expect(clearedRowCount).toBeGreaterThan(0);
		await expect
			.poll(async () => {
				const rowCount = await getDataRows().count();
				for (let index = 0; index < rowCount; index += 1) {
					const stateText = (await getDataRows().nth(index).locator('td').nth(3).textContent())?.trim();
					if (stateText && stateText !== targetState) {
						return true;
					}
				}
				return false;
			})
			.toBe(true);
	});
});
