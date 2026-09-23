const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Data Table Controls', () => {
	test('TC_VerifyRiaDataTableControlsAndColumnVisibility', async ({ page }) => {
		test.setTimeout(90000);

		const email = 'SZ_AutoQA@stratzen.ai';
		const passwordValue = 'StratzenAutomation123';

		const getColumnsButton = () => page.getByRole('button', { name: 'Columns', exact: true });
		const getFiltersButton = () => page.getByRole('button', { name: 'Filters', exact: true });
		const getDensityButton = () => page.getByRole('button', { name: 'Density', exact: true });
		const getExportButton = () => page.getByRole('button', { name: /^Export\b/i }).first();
		const getRiasTable = () => page.locator('table').first();
		const getTableHeaders = () => getRiasTable().getByRole('columnheader');
		const getColumnHeader = (name) => getRiasTable().getByRole('columnheader').filter({ hasText: name });
		const getColumnsPopup = () => page.getByRole('menu').last();
		const getColumnsResetButton = () => getColumnsPopup().getByRole('button', { name: 'RESET', exact: true });
		const getColumnToggle = (name) =>
			getColumnsPopup().getByRole('checkbox', { name: new RegExp(name, 'i') }).first();

		const isToggleChecked = async (toggle) => {
			return toggle.evaluate((element) => {
				if (element instanceof HTMLInputElement) {
					return Boolean(element.checked);
				}

				return element.getAttribute('aria-checked') === 'true'
					|| element.getAttribute('data-state') === 'checked';
			});
		};

		const setToggleState = async (columnName, shouldBeChecked) => {
			const toggle = getColumnToggle(columnName);

			await expect(toggle).toBeVisible();
			if ((await isToggleChecked(toggle)) !== shouldBeChecked) {
				await toggle.click({ force: true });
			}

			await expect
				.poll(async () => isToggleChecked(toggle))
				.toBe(shouldBeChecked);
		};

		await page.goto('https://demoapp.stratzen.ai/login');
		await expect(page).toHaveURL(/login/);

		await page.locator('input[type="email"]').fill(email);
		await page.locator('input[type="password"]').fill(passwordValue);
		await page.getByRole('button', { name: /sign in/i }).click();

		await page.waitForURL('https://demoapp.stratzen.ai/summary');
		await page.getByRole('link', { name: 'RIAs', exact: true }).click();
		await expect(page).toHaveURL(/\/rias$/);
		await expect(page.getByRole('heading', { name: 'Explore RIAs', exact: true })).toBeVisible();

		await expect(getRiasTable()).toBeVisible();
		await expect(getTableHeaders().first()).toBeVisible();

		const riasUrl = page.url();

		await getColumnsButton().scrollIntoViewIfNeeded();
		await expect(getColumnsButton()).toBeVisible();
		await expect(getFiltersButton()).toBeVisible();
		await expect(getDensityButton()).toBeVisible();
		await expect(getExportButton()).toBeVisible();

		await getColumnsButton().click();
		await expect(getColumnsPopup()).toBeVisible();
		await expect(page).toHaveURL(riasUrl);
		await expect(getRiasTable()).toBeVisible();

		const crdToggle = getColumnToggle('CRD');
		const businessNameToggle = getColumnToggle('Business Name');
		await expect(crdToggle).toBeVisible();
		await expect(businessNameToggle).toBeVisible();

		await setToggleState('CRD', true);
		await setToggleState('Business Name', true);

		await setToggleState('CRD', false);
		await setToggleState('Business Name', false);
		await expect
			.poll(async () => await getColumnHeader('CRD').count())
			.toBe(0);
		await expect
			.poll(async () => await getColumnHeader('Business Name').count())
			.toBe(0);

		await expect(getColumnsPopup()).toBeVisible();
		await getColumnsResetButton().click();
		await page.keyboard.press('Escape');
		await expect(getColumnsPopup()).toBeHidden();
		await expect(getColumnHeader('Business Name')).toBeVisible();
	});
});
