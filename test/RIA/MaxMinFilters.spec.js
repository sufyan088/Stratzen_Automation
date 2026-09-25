const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Max / Min Filters', () => {
	test('TC_VerifyAumMinimumAndMaximumFiltering', async ({ page }) => {
		test.setTimeout(90000);

		const email = 'SZ_AutoQA@stratzen.ai';
		const passwordValue = 'StratzenAutomation123';
		const minAum = 10000;
		const maxAum = 30000;

		const parseAumValue = (value) => {
			if (!value) {
				return NaN;
			}

			const normalizedValue = value.replace(/[$,\s]/g, '').toUpperCase();
			const match = normalizedValue.match(/(-?\d+(?:\.\d+)?)([KMBT])?/);
			if (!match) {
				return NaN;
			}

			const numericValue = Number(match[1]);
			const multipliers = {
				K: 1_000,
				M: 1_000_000,
				B: 1_000_000_000,
				T: 1_000_000_000_000,
			};

			return numericValue * (multipliers[match[2]] || 1);
		};

		await page.goto('https://demoapp.stratzen.ai/login');
		await expect(page).toHaveURL(/login/);

		await page.locator('input[type="email"]').fill(email);
		await page.locator('input[type="password"]').fill(passwordValue);
		await page.getByRole('button', { name: /sign in/i }).click();

		await page.waitForURL('https://demoapp.stratzen.ai/summary');
		await page.getByRole('link', { name: 'RIAs', exact: true }).click();
		await expect(page).toHaveURL(/\/rias$/);

		const riasTable = page.locator('table').first();
		const dataRows = riasTable.locator('tbody tr');
		const aumHeader = riasTable.getByRole('columnheader').nth(4);
		const minAumField = aumHeader.locator('input').first();
		const maxAumField = aumHeader.locator('input').nth(1);

		const clearField = async (field) => {
			await field.click();
			await field.press('ControlOrMeta+A');
			await field.press('Backspace');
			await field.blur();
		};

		const getVisibleAumValues = async () => {
			const rowCount = await dataRows.count();
			const values = [];

			for (let index = 0; index < rowCount; index += 1) {
				const cellText = (await dataRows.nth(index).locator('td').nth(4).textContent())?.trim() || '';
				values.push(parseAumValue(cellText));
			}

			return values;
		};

		await expect(riasTable).toBeVisible();
		await expect(dataRows.first()).toBeVisible();
		await expect(aumHeader).toContainText('AUM');
		await expect(minAumField).toBeVisible();
		await expect(maxAumField).toBeVisible();

		const initialRowCount = await dataRows.count();
		expect(initialRowCount).toBeGreaterThan(0);

		await minAumField.fill(String(minAum));
		await expect(minAumField).toHaveValue(String(minAum));

		await expect
			.poll(async () => {
				const values = await getVisibleAumValues();
				return values.length > 0 && values.every((value) => !Number.isNaN(value) && value >= minAum);
			})
			.toBe(true);

		await maxAumField.fill(String(maxAum));
		await expect(maxAumField).toHaveValue(String(maxAum));

		await expect
			.poll(async () => {
				const values = await getVisibleAumValues();
				return (
					values.length > 0 &&
					values.every((value) => !Number.isNaN(value) && value >= minAum && value <= maxAum)
				);
			})
			.toBe(true);

		const filteredValues = await getVisibleAumValues();
		expect(filteredValues.length).toBeGreaterThan(0);
		for (const value of filteredValues) {
			expect(value).toBeGreaterThanOrEqual(minAum);
			expect(value).toBeLessThanOrEqual(maxAum);
		}

		const filteredRowCount = await dataRows.count();
		expect(filteredRowCount).toBeGreaterThan(0);

		await clearField(minAumField);
		await clearField(maxAumField);
		await expect(minAumField).toHaveValue('');
		await expect(maxAumField).toHaveValue('');

		await expect(dataRows.first()).toBeVisible();
		await expect
			.poll(async () => {
				const rowCount = await dataRows.count();
				const values = await getVisibleAumValues();
				return rowCount >= filteredRowCount && values.some((value) => !Number.isNaN(value) && (value < minAum || value > maxAum));
			})
			.toBe(true);
		});
});
