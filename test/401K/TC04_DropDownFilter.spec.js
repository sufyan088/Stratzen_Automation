import { test, expect } from '@playwright/test';
import {
	completeSignInWithOptionalOutlookSso,
	getTestData,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from '../Summary/mammothhai-playwright-helpers.js';

test.describe('401K Module - Dropdown Filters', () => {
	test.describe.configure({ timeout: 90000 });

	test('TC04_VerifyStateFilterDropdownAppliesAndClearsCorrectly', async ({ page }) => {
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

		const targetState = 'Alaska';

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
		const getDataRows = () => dataTable.locator('tbody tr');
		const stateColumnIndex = 6;
		const getStateHeader = () => dataTable.getByRole('columnheader').nth(stateColumnIndex);
		const getStateFilterControl = () => getStateHeader().getByRole('combobox');
		const getStateFilterList = () => page.getByRole('listbox').last();
		const getTargetStateOption = () =>
			getStateFilterList().getByRole('option', {
				name: /Alaska(\s*\(AK\))?/i,
			});
		const getTargetStateCheckbox = () => getTargetStateOption().getByRole('checkbox');
		const isAlaskaStateValue = (value) => /^(alaska|ak)$/i.test(value);

		await test.step('Step 6: Open the State filter control', async () => {
			await expect(dataTable).toBeVisible();
			expect(await getDataRows().count()).toBeGreaterThan(0);

			const stateFilterControl = getStateFilterControl();
			await expect(stateFilterControl).toBeVisible();
			await stateFilterControl.click();
			await expect(getStateFilterList()).toBeVisible();
		});

		await test.step('Step 7: Search/select Alaska in the State dropdown', async () => {
			await expect(getTargetStateOption()).toBeVisible();

			if ((await getTargetStateCheckbox().count()) > 0) {
				const optionCheckedBefore = await getTargetStateCheckbox().isChecked().catch(() => false);
				if (!optionCheckedBefore) {
					await getTargetStateCheckbox().click();
				}
				await expect(getTargetStateCheckbox()).toBeChecked();
			} else {
				await getTargetStateOption().click();
			}

			await expect(getDataRows().first()).toBeVisible();
		});

		await test.step('Step 8: Verify all returned rows satisfy State = Alaska', async () => {
			await expect(getDataRows()).not.toHaveCount(0);
			await expect
				.poll(async () => {
					const rowCount = await getDataRows().count();
					if (rowCount === 0) {
						return false;
					}

					for (let index = 0; index < rowCount; index += 1) {
						const stateValue = ((await getDataRows().nth(index).locator('td').nth(stateColumnIndex).textContent()) || '')
							.replace(/\s+/g, ' ')
							.trim();
						if (!isAlaskaStateValue(stateValue)) {
							return false;
						}
					}

					return true;
				}, { timeout: 20000 })
				.toBe(true);

			const filteredRowCount = await getDataRows().count();
			expect(filteredRowCount).toBeGreaterThan(0);

			for (let rowIndex = 0; rowIndex < filteredRowCount; rowIndex += 1) {
				const stateValue = ((await getDataRows().nth(rowIndex).locator('td').nth(stateColumnIndex).textContent()) || '')
					.replace(/\s+/g, ' ')
					.trim();
				expect(
					isAlaskaStateValue(stateValue),
					`Expected row ${rowIndex + 1} to have Alaska state value, but got "${stateValue}".`,
				).toBe(true);
			}
		});

		await test.step('Step 9: Reopen State filter and remove Alaska', async () => {
			if (!(await getStateFilterList().isVisible().catch(() => false))) {
				const stateFilterControl = getStateFilterControl();
				await expect(stateFilterControl).toBeVisible();
				await stateFilterControl.click();
			}
			await expect(getStateFilterList()).toBeVisible();
			await expect(getTargetStateOption()).toBeVisible();

			if ((await getTargetStateCheckbox().count()) > 0) {
				await expect(getTargetStateCheckbox()).toBeChecked();
				await getTargetStateCheckbox().click();
				await expect(getTargetStateCheckbox()).not.toBeChecked();
			} else {
				await getTargetStateOption().click();
			}
		});

		await test.step('Step 10: Verify State restriction is removed', async () => {
			await expect(getDataRows().first()).toBeVisible();
			await expect(getDataRows()).not.toHaveCount(0);

			await expect
				.poll(async () => {
					const rowCount = await getDataRows().count();
					for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
						const stateValue = ((await getDataRows().nth(rowIndex).locator('td').nth(stateColumnIndex).textContent()) || '')
							.replace(/\s+/g, ' ')
							.trim();
						if (stateValue && !isAlaskaStateValue(stateValue)) {
							return true;
						}
					}

					return false;
				}, { timeout: 15000 })
				.toBe(true);
		});

		await test.step('Step 11: Logout from the application', async () => {
			if (await getStateFilterList().isVisible().catch(() => false)) {
				await page.keyboard.press('Escape');
				await expect(getStateFilterList()).not.toBeVisible({ timeout: 15000 });
			}

			await safeClick(page.getByText('QA', { exact: true }), { timeout: 30000 });
			await safeClick(page.getByRole('menuitem', { name: 'Logout' }), { timeout: 30000 });
			await expect(page).toHaveURL(/login/);
		});
	});
});
