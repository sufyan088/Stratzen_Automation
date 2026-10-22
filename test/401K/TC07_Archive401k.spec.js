import { test, expect } from '@playwright/test';
import {
	completeSignInWithOptionalOutlookSso,
	getTestData,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from '../Summary/mammothhai-playwright-helpers.js';

test.describe('401K Module - Archive Action', () => {
	test.describe.configure({ timeout: 120000 });

	test('TC07_Verify401KArchiveStatusFilterArchiveAndUnarchiveWorkflow', async ({ page }) => {
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

		const notArchivedLabel = /not archived/i;
		const archivedLabel = /^archived$/i;
		const archiveSuccessMessage = /plan archived/i;
		const unarchiveSuccessMessage = /plan unarchived/i;

		if (!destinationUrl) throw new Error('Missing destination_url__step1 / BASEURL test data.');
		if (!email || !passwordValue) throw new Error('Missing username or password in project.use or environment variables.');

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
		const einFilterField = dataTable.getByRole('columnheader').nth(0).getByRole('textbox');
		const actionsHeader = dataTable.getByRole('columnheader').nth(8);
		const archiveStatusList = page.getByRole('listbox').last();
		const archiveStatusMenu = page.getByRole('menu').last();
		const notArchivedOption = page.getByRole('option', { name: notArchivedLabel }).last();
		const archivedOption = page.getByRole('option', { name: archivedLabel }).last();

		const openArchiveStatusMenu = async () => {
			let archiveStatusControl = actionsHeader.getByRole('button', { name: /not archived|archived/i }).first();
			if ((await archiveStatusControl.count()) === 0) {
				archiveStatusControl = actionsHeader.getByRole('combobox').first();
			}
			if ((await archiveStatusControl.count()) === 0) {
				archiveStatusControl = actionsHeader.getByText(/not archived|archived/i).locator('..').first();
			}

			await expect(archiveStatusControl).toBeVisible();
			await archiveStatusControl.click();

			if (await archiveStatusList.isVisible().catch(() => false)) {
				await expect(archiveStatusList).toBeVisible();
			} else {
				await expect(archiveStatusMenu).toBeVisible();
			}
		};

		const selectArchiveStatus = async (optionLocator, expectedLabel) => {
			await openArchiveStatusMenu();

			let candidateOption = optionLocator;
			if ((await candidateOption.count()) === 0) {
				candidateOption = page.getByRole('menuitem', { name: expectedLabel }).last();
			}
			if ((await candidateOption.count()) === 0) {
				candidateOption = page.getByText(expectedLabel).last();
			}

			await expect(candidateOption).toBeVisible();
			await candidateOption.click();

			const archiveStatusButton = actionsHeader.getByRole('button').first();
			const archiveStatusCombobox = actionsHeader.getByRole('combobox').first();
			if (await archiveStatusButton.isVisible().catch(() => false)) {
				await expect(archiveStatusButton).toContainText(expectedLabel);
			} else {
				await expect(archiveStatusCombobox).toContainText(expectedLabel);
			}
		};

		const getFirstPopulatedRow = async () => {
			const rowCount = await dataRows.count();
			for (let index = 0; index < rowCount; index += 1) {
				const row = dataRows.nth(index);
				const ein = (await row.locator('td').nth(0).textContent())?.trim() || '';
				const planName = (await row.locator('td').nth(1).textContent())?.trim() || '';
				if (ein && planName) {
					return { row, ein, planName };
				}
			}

			return null;
		};

		await test.step('Step 6: Verify archive filter and switch to Not Archived', async () => {
			await expect(dataTable).toBeVisible();
			await expect(dataRows.first()).toBeVisible();
			await expect(actionsHeader).toContainText(/actions/i);

			const initialArchiveStatusButton = actionsHeader.getByRole('button').first();
			const initialArchiveStatusCombobox = actionsHeader.getByRole('combobox').first();
			if (await initialArchiveStatusButton.isVisible().catch(() => false)) {
				await expect(initialArchiveStatusButton).toContainText(/not archived|archived/i);
			} else {
				await expect(initialArchiveStatusCombobox).toContainText(/not archived|archived/i);
			}

			await selectArchiveStatus(notArchivedOption, notArchivedLabel);
			await einFilterField.fill('');
			await einFilterField.press('Enter');
		});

		await test.step('Step 7: Record first-row EIN and archive the plan', async () => {
			await expect
				.poll(async () => {
					const populatedRow = await getFirstPopulatedRow();
					return populatedRow !== null;
				}, { timeout: 30000 })
				.toBe(true);
			const populatedRow = await getFirstPopulatedRow();
			if (!populatedRow) {
				throw new Error('Expected at least one populated 401K row in the not archived view.');
			}

			const { row: targetRow, ein: targetEin, planName: targetPlanName } = populatedRow;
			await expect(targetRow).toBeVisible();

			const actionsCell = targetRow.locator('td').last();
			const archiveButtonByName = actionsCell.getByRole('button', { name: /archive plan|archive 401k|archive/i });
			const visibleActionButtons = actionsCell.locator('button:visible');
			const archiveButton = (await archiveButtonByName.count()) > 0 ? archiveButtonByName.first() : visibleActionButtons.nth(1);

			await expect(visibleActionButtons).toHaveCount(2);
			await expect(archiveButton).toBeVisible();
			await archiveButton.click();
			await expect(page.getByText(archiveSuccessMessage).last()).toBeVisible();

			await selectArchiveStatus(archivedOption, archivedLabel);
			await einFilterField.fill('');
			await einFilterField.fill(targetEin);
			await einFilterField.press('Enter');
			await expect(einFilterField).toHaveValue(targetEin);

			const archivedTargetRow = dataRows.filter({ has: page.getByText(targetEin, { exact: true }) }).first();
			await expect(archivedTargetRow).toBeVisible({ timeout: 15000 });
			await expect(archivedTargetRow.locator('td').nth(0)).toContainText(targetEin);
			await expect(archivedTargetRow.locator('td').nth(1)).toContainText(targetPlanName);

			const archivedActionsCell = archivedTargetRow.locator('td').last();
			const unarchiveButtonByName = archivedActionsCell.getByRole('button', { name: /unarchive plan|unarchive 401k|unarchive/i });
			const archivedActionButtons = archivedActionsCell.locator('button:visible');
			const unarchiveButton = (await unarchiveButtonByName.count()) > 0
				? unarchiveButtonByName.first()
				: archivedActionButtons.nth(1);

			await expect(unarchiveButton).toBeVisible();
			await unarchiveButton.click();
			await expect(page.getByText(unarchiveSuccessMessage).last()).toBeVisible();

			await selectArchiveStatus(notArchivedOption, notArchivedLabel);
			await einFilterField.fill('');
			await einFilterField.fill(targetEin);
			await einFilterField.press('Enter');
			await expect(einFilterField).toHaveValue(targetEin);

			const restoredTargetRow = dataRows.filter({ has: page.getByText(targetEin, { exact: true }) }).first();
			await expect(restoredTargetRow).toBeVisible({ timeout: 15000 });
			await expect(restoredTargetRow.locator('td').nth(0)).toContainText(targetEin);
			await expect(restoredTargetRow.locator('td').nth(1)).toContainText(targetPlanName);
		});

		await test.step('Step 8: Logout from the application', async () => {
			await safeClick(page.getByText('QA', { exact: true }), { timeout: 30000 });
			await safeClick(page.getByRole('menuitem', { name: 'Logout' }), { timeout: 30000 });
			await expect(page).toHaveURL(/login/);
		});
	});
});