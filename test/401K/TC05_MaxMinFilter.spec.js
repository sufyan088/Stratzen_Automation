import { test, expect } from '@playwright/test';
import {
	completeSignInWithOptionalOutlookSso,
	getTestData,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from '../Summary/mammothhai-playwright-helpers.js';

test.describe('401K Module - Max / Min Filters', () => {
	test.describe.configure({ timeout: 120000 });

	test('TC05_VerifyParticipantsTotalAssetsAndTotalFeesMinimumMaximumFilters', async ({ page }) => {
		installNativeDialogHandler(page);
		// Resolve runtime configuration and test data for the advisor session.
		const use = test.info().project.use;
		const destinationUrlStep1 = getTestData('destination_url__step1');
		const appBaseUrl = process.env.URL
			|| process.env.APP_URL
			|| process.env.BASE_URL
			|| use.baseURL;

		if (!appBaseUrl) {
			throw new Error('Set URL, APP_URL, or BASE_URL before running this test.');
		}

		const destinationUrl = destinationUrlStep1 || `${String(appBaseUrl).replace(/\/+$/, '')}/login`;
		const email = use.username || process.env.STRATZEN_EMAIL;
		const passwordValue = use.password || process.env.STRATZEN_PASSWORD;
		const outlookUsername = use.outlookUsername || process.env.OUTLOOK_EMAIL;
		const outlookPassword = use.outlookPassword || process.env.OUTLOOK_PASSWORD;

		if (!destinationUrl) throw new Error('Missing destination_url__step1 / BASEURL test data.');
		if (!email || !passwordValue) throw new Error('Missing username or password in project.use or environment variables.');

		const participantsMin = 50;
		const participantsMax = 200;
		const totalAssetsMin = 50000;
		const totalAssetsMax = 70000;
		const totalFeesMin = 1000;
		const totalFeesMax = 2000;

		const parseNumericValue = (value) => {
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

		// Reuse the first matching 401K navigation entry so the test survives minor nav label changes.
		const openExplore401K = async () => {
			const is401KViewOpen = async () => {
				if (/401k|401-k/i.test(page.url())) return true;

				const viewMarkers = [
					page.getByRole('heading', { name: /explore\s*401k/i }).first(),
					page.getByRole('button', { name: /saved filters/i }).first(),
					page.getByRole('textbox', { name: /e\.g\.\s*12-3456789/i }).first(),
					page.locator('table').first(),
				];

				for (const marker of viewMarkers) {
					if (await marker.isVisible().catch(() => false)) {
						return true;
					}
				}

				return false;
			};

			const navigationOptions = [
				page.getByRole('link', { name: '401K', exact: true }),
				page.getByRole('link', { name: '401Ks', exact: true }),
				page.getByRole('link', { name: 'Explore 401K', exact: true }),
				page.getByRole('button', { name: /401k|401ks|explore 401k/i }),
				page.getByRole('menuitem', { name: /401k|401ks|explore 401k/i }),
				page.getByRole('tab', { name: /401k|401ks|explore 401k/i }),
				page.getByText(/401k|401ks|explore 401k/i).first(),
			];

			for (const navigationLink of navigationOptions) {
				if (await navigationLink.count() && await navigationLink.first().isVisible().catch(() => false)) {
					await safeClick(navigationLink.first(), { timeout: 30000 });
					await page.waitForLoadState('networkidle');
					if (await is401KViewOpen()) {
						return;
					}
					continue;
				}
			}

			// Fallback to known route patterns if left-nav labels are changed or hidden.
			const routeFallbacks = ['/research', '/research/401k', '/research/explore-401k', '/401k', '/401-k', '/explore-401k'];
			for (const route of routeFallbacks) {
				await page.goto(new URL(route, appBaseUrl).toString(), {
					waitUntil: 'domcontentloaded',
					timeout: 90000,
				});
				await page.waitForLoadState('networkidle').catch(() => {});

				const researchEntry = page.getByRole('link', { name: /401k|401ks|explore 401k/i }).first();
				if (await researchEntry.isVisible().catch(() => false)) {
					await safeClick(researchEntry, { timeout: 30000 });
					await page.waitForLoadState('networkidle').catch(() => {});
				}

				if (await is401KViewOpen()) {
					return;
				}
			}

			throw new Error(`Could not open the Explore 401K page. Current URL: ${page.url()}`);
		};

		await test.step('Step 1: Navigate to the login page', async () => {
			await page.goto(destinationUrl, {
				waitUntil: 'domcontentloaded',
				timeout: 90000,
			});
			await expect(page).toHaveURL(/login/);
		});

		await test.step('Step 2: Enter the advisor email address', async () => {
			const emailField = await resilientLocator(page, ['input[type="email"]'], { labelFallback: 'Email Address', role: 'textbox' });
			await safeFill(emailField, String(email));
			await expect(page.locator('input[type="email"]').first()).toHaveValue(String(email));
		});

		await test.step('Step 3: Enter the advisor password', async () => {
			const passwordField = await resilientLocator(page, ['input[type="password"]'], { labelFallback: 'Password', role: 'textbox' });
			await safeFill(passwordField, String(passwordValue));
			await expect(page.locator('input[type="password"]').first()).toHaveValue(String(passwordValue));
		});

		await test.step('Step 4: Sign in to the application', async () => {
			const signInButton = await resilientLocator(page, ['button[type="submit"]'], { labelFallback: 'Sign In', role: 'button' });
			await safeClick(signInButton, { timeout: 15000 });
			await completeSignInWithOptionalOutlookSso(page, outlookUsername, outlookPassword);
			await expect(page).toHaveURL(/summary/);
		});

		await test.step('Step 5: Open Explore 401K', async () => {
			await openExplore401K();
			await expect.poll(async () => {
				const headingVisible = await page
					.getByRole('heading', { name: /Explore 401k/i })
					.first()
					.isVisible()
					.catch(() => false);
				const tableVisible = await page.locator('table').first().isVisible().catch(() => false);
				return headingVisible || tableVisible;
			}, { timeout: 30000 }).toBe(true);
		});

		const dataTable = page.locator('table').first();
		const dataRows = dataTable.locator('tbody tr');

		const participantsHeader = dataTable.getByRole('columnheader').nth(2);
		const participantsMinField = participantsHeader.locator('input').first();
		const participantsMaxField = participantsHeader.locator('input').nth(1);

		const totalAssetsHeader = dataTable.getByRole('columnheader').nth(3);
		const totalAssetsMinField = totalAssetsHeader.locator('input').first();
		const totalAssetsMaxField = totalAssetsHeader.locator('input').nth(1);

		const totalFeesHeader = dataTable.getByRole('columnheader').nth(4);
		const totalFeesMinField = totalFeesHeader.locator('input').first();
		const totalFeesMaxField = totalFeesHeader.locator('input').nth(1);

		const clearField = async (field) => {
			await activateField(field);
			await field.press('ControlOrMeta+A');
			await field.press('Backspace');
			await field.blur();
		};

		const activateField = async (field) => {
			await field.scrollIntoViewIfNeeded().catch(() => {});
			const focused = await field.focus().then(() => true).catch(() => false);
			if (!focused) {
				await field.evaluate((element) => element.focus());
			}
		};

		const commitField = async (field) => {
			await field.press('Enter').catch(() => {});
			await field.blur();
		};

		const getNormalizedFieldValue = async (field) => {
			const rawValue = (await field.inputValue().catch(() => '')) || '';
			return rawValue.replace(/[,$\s]/g, '').trim();
		};

		const setNumericFieldWithRetry = async (field, value) => {
			const expectedValue = String(value);
			for (let attempt = 0; attempt < 3; attempt += 1) {
				await activateField(field);
				await field.press('ControlOrMeta+A');
				await field.press('Backspace');
				await field.fill(expectedValue);
				await commitField(field);

				const normalizedValue = await getNormalizedFieldValue(field);
				if (normalizedValue === expectedValue) {
					return;
				}

				await activateField(field);
				await field.press('ControlOrMeta+A');
				await field.press('Backspace');
				await field.type(expectedValue, { delay: 40 });
				await commitField(field);

				const typedValue = await getNormalizedFieldValue(field);
				if (typedValue === expectedValue) {
					return;
				}
			}

			throw new Error(`Unable to set numeric field value to ${expectedValue} after retries.`);
		};

		const getVisibleColumnValues = async (columnIndex) => {
			const rowCount = await dataRows.count();
			const values = [];

			for (let index = 0; index < rowCount; index += 1) {
				const row = dataRows.nth(index);
				if (!(await row.isVisible().catch(() => false))) {
					continue;
				}

				const cellText = (await row.locator('td').nth(columnIndex).textContent())?.trim() || '';
				const parsedValue = parseNumericValue(cellText);
				if (!Number.isNaN(parsedValue)) {
					values.push(parsedValue);
				}
			}

			return values;
		};

		const verifyRangeValues = async (columnIndex, minValue, maxValue) => {
			await expect
				.poll(async () => {
					const values = await getVisibleColumnValues(columnIndex);
					return (
						values.length > 0
						&& values.every((value) => !Number.isNaN(value) && value >= minValue && value <= maxValue)
					);
				}, { timeout: 30000 })
				.toBe(true);

			const values = await getVisibleColumnValues(columnIndex);
			expect(values.length).toBeGreaterThan(0);
			for (const value of values) {
				expect(value).toBeGreaterThanOrEqual(minValue);
				expect(value).toBeLessThanOrEqual(maxValue);
			}
		};

		const verifyRestrictionRemoved = async (columnIndex, minValue, maxValue, filteredRowCount) => {
			await expect(dataRows.first()).toBeVisible();
			await expect
				.poll(async () => {
					const rowCount = await dataRows.count();
					const values = await getVisibleColumnValues(columnIndex);
					return rowCount >= filteredRowCount
						&& values.some((value) => !Number.isNaN(value) && (value < minValue || value > maxValue));
				}, { timeout: 30000 })
				.toBe(true);
		};

		await test.step('Step 6: Enter Participants minimum value', async () => {
			await expect(dataTable).toBeVisible();
			await expect(dataRows.first()).toBeVisible();
			await expect(participantsHeader).toContainText('Participants');
			await expect(participantsMinField).toBeVisible();
			await expect(participantsMaxField).toBeVisible();

			await setNumericFieldWithRetry(participantsMinField, participantsMin);
			await expect.poll(async () => getNormalizedFieldValue(participantsMinField), { timeout: 15000 }).toBe(String(participantsMin));

			await expect
				.poll(async () => {
					const values = await getVisibleColumnValues(2);
					return values.length > 0 && values.every((value) => !Number.isNaN(value) && value >= participantsMin);
				}, { timeout: 30000 })
				.toBe(true);
		});

		await test.step('Step 7: Enter Participants maximum and verify range', async () => {
			await setNumericFieldWithRetry(participantsMaxField, participantsMax);
			await expect.poll(async () => getNormalizedFieldValue(participantsMaxField), { timeout: 15000 }).toBe(String(participantsMax));

			await verifyRangeValues(2, participantsMin, participantsMax);
		});

		await test.step('Step 8: Clear Participants range and verify restriction is removed', async () => {
			const filteredRowCount = await dataRows.count();
			expect(filteredRowCount).toBeGreaterThan(0);

			await clearField(participantsMinField);
			await clearField(participantsMaxField);
			await expect(participantsMinField).toHaveValue('');
			await expect(participantsMaxField).toHaveValue('');

			await verifyRestrictionRemoved(2, participantsMin, participantsMax, filteredRowCount);
		});

		await test.step('Step 9: Enter Total Assets minimum and maximum values', async () => {
			await expect(totalAssetsHeader).toContainText('Total Assets');
			await expect(totalAssetsMinField).toBeVisible();
			await expect(totalAssetsMaxField).toBeVisible();

			await setNumericFieldWithRetry(totalAssetsMinField, totalAssetsMin);
			await expect.poll(async () => getNormalizedFieldValue(totalAssetsMinField), { timeout: 15000 }).toBe(String(totalAssetsMin));
			await setNumericFieldWithRetry(totalAssetsMaxField, totalAssetsMax);
			await expect.poll(async () => getNormalizedFieldValue(totalAssetsMaxField), { timeout: 15000 }).toBe(String(totalAssetsMax));

			await verifyRangeValues(3, totalAssetsMin, totalAssetsMax);
		});

		await test.step('Step 10: Clear Total Assets range and verify restriction is removed', async () => {
			const filteredRowCount = await dataRows.count();
			expect(filteredRowCount).toBeGreaterThan(0);

			await clearField(totalAssetsMinField);
			await clearField(totalAssetsMaxField);
			await expect(totalAssetsMinField).toHaveValue('');
			await expect(totalAssetsMaxField).toHaveValue('');

			await verifyRestrictionRemoved(3, totalAssetsMin, totalAssetsMax, filteredRowCount);
		});

		await test.step('Step 11: Enter Total Fees minimum and maximum values', async () => {
			await expect(totalFeesHeader).toContainText('Total Fees');
			await expect(totalFeesMinField).toBeVisible();
			await expect(totalFeesMaxField).toBeVisible();

			await setNumericFieldWithRetry(totalFeesMinField, totalFeesMin);
			await expect.poll(async () => getNormalizedFieldValue(totalFeesMinField), { timeout: 15000 }).toBe(String(totalFeesMin));
			await setNumericFieldWithRetry(totalFeesMaxField, totalFeesMax);
			await expect.poll(async () => getNormalizedFieldValue(totalFeesMaxField), { timeout: 15000 }).toBe(String(totalFeesMax));

			await verifyRangeValues(4, totalFeesMin, totalFeesMax);
		});

		await test.step('Step 12: Clear Total Fees range and verify restriction is removed', async () => {
			const filteredRowCount = await dataRows.count();
			expect(filteredRowCount).toBeGreaterThan(0);

			await clearField(totalFeesMinField);
			await clearField(totalFeesMaxField);
			await expect(totalFeesMinField).toHaveValue('');
			await expect(totalFeesMaxField).toHaveValue('');

			await verifyRestrictionRemoved(4, totalFeesMin, totalFeesMax, filteredRowCount);
		});

		await test.step('Step 13: Logout from the application', async () => {
			await safeClick(page.getByText('QA', { exact: true }), { timeout: 30000 });
			await safeClick(page.getByRole('menuitem', { name: 'Logout' }), { timeout: 30000 });
			await expect(page).toHaveURL(/login/);
		});
	});
});
