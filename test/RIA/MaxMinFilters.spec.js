const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Max / Min Filters', () => {
	test('TC_VerifyAumMinimumAndMaximumFiltering', async ({ page }) => {
		test.setTimeout(90000);
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

		await test.step('Step 1: Navigate to the login page', async () => {
			await page.goto(buildUrl('/login'), {
				waitUntil: 'domcontentloaded',
				timeout: 90000,
			});
			await expect(page).toHaveURL(/login/);
		});

		await test.step('Step 2: Enter the email address', async () => {
			const emailField = page.getByRole('textbox', { name: /email/i }).or(page.locator('input[type="email"]')).first();
			await expect(emailField).toBeVisible();
			await emailField.fill(email);
		});

		await test.step('Step 3: Enter the password', async () => {
			const passwordField = page.locator('input[type="password"]').first();
			await expect(passwordField).toBeVisible();
			await passwordField.fill(passwordValue);
		});

		await test.step('Step 4: Click the Sign In button', async () => {
			await page.getByRole('button', { name: /sign in/i }).click();
		});

		await test.step('Step 5: Open the RIAs page', async () => {
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/summary/);
			await page.getByRole('link', { name: 'RIAs', exact: true }).click();
			await expect(page).toHaveURL(/\/rias$/);
		});

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
				const row = dataRows.nth(index);
				if (!(await row.isVisible())) {
					continue;
				}

				const cellText = (await row.locator('td').nth(4).textContent())?.trim() || '';
				const parsedValue = parseAumValue(cellText);
				if (!Number.isNaN(parsedValue)) {
					values.push(parsedValue);
				}
			}

			return values;
		};

		await test.step('Step 6: Apply minimum and maximum AUM filters and verify the results', async () => {
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
		});

		await test.step('Step 7: Clear the AUM filters and verify broader results return', async () => {
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

		await test.step('Step 8: Log out so the test remains independent', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
		});
});
