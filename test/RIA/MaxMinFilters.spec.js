import { test, expect } from '@playwright/test';
import {
	getTestData,
	completeSignInWithOptionalOutlookSso,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from './mammothhai-playwright-helpers.js';

test.describe('RIA Module - Max / Min Filters', () => {
	test.describe.configure({ timeout: 90000 });
	test('TC_VerifyAumMinimumAndMaximumFiltering', async ({ page }) => {
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
		const minAum = 10000;
		const maxAum = 30000;

		if (!destinationUrl) throw new Error('Missing destination_url__step1 / BASEURL test data.');
		if (!authUsername || !password) throw new Error('Missing username or password in project.use or environment variables.');

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

		// Step 1: Navigate to the login page.
		await test.step('Step 1: Navigate to the login page', async () => {
			await page.goto(destinationUrl, {
				waitUntil: 'domcontentloaded',
				timeout: 90000,
			});
			await expect(page).toHaveURL(/login/);
		});

		// Step 2: Enter the email address.
		await test.step('Step 2: Enter the email address', async () => {
			const emailControl = await resilientLocator(page, ['input[type="email"]'], { labelFallback: 'Email Address', role: 'textbox' });
			await safeFill(emailControl, String(authUsername));
			await expect(page.locator('input[type="email"]').first()).toHaveValue(String(authUsername));
		});

		// Step 3: Enter the password.
		await test.step('Step 3: Enter the password', async () => {
			const passwordControl = await resilientLocator(page, ['input[type="password"]'], { labelFallback: 'Password', role: 'textbox' });
			await safeFill(passwordControl, String(password));
			await expect(page.locator('input[type="password"]').first()).toHaveValue(String(password));
		});

		// Step 4: Click the Sign In button.
		await test.step('Step 4: Click the Sign In button', async () => {
			const signInButton = await resilientLocator(page, ['button[type="submit"]'], { labelFallback: 'Sign In', role: 'button' });
			await safeClick(signInButton, { timeout: 15000 });
			await completeSignInWithOptionalOutlookSso(page, outlookUsername, outlookPassword);
		});

		// Step 5: Open the RIAs page.
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

		// Step 6: Apply minimum and maximum AUM filters and verify the results.
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
				}, { timeout: 30000 })
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
				}, { timeout: 30000 })
				.toBe(true);

			const filteredValues = await getVisibleAumValues();
			expect(filteredValues.length).toBeGreaterThan(0);
			for (const value of filteredValues) {
				expect(value).toBeGreaterThanOrEqual(minAum);
				expect(value).toBeLessThanOrEqual(maxAum);
			}
		});

		// Step 7: Clear the AUM filters and verify broader results return.
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
				}, { timeout: 30000 })
				.toBe(true);
		});

		// Step 8: Logout from the application.
		await test.step('Step 8: Logout from the application', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
		});
});
