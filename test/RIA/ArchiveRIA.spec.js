const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Archive Action', () => {
	test('TC_VerifyRiaArchiveStatusFilterAndArchiveAction', async ({ page }) => {
		test.setTimeout(120000);
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
		const notArchivedLabel = /not archived/i;
		const archivedLabel = /^archived$/i;
		const archiveSuccessMessage = /RIA Archived/i;
		const unarchiveSuccessMessage = /RIA unarchived/i;

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
		const crdFilterField = riasTable.getByRole('columnheader').nth(0).getByRole('textbox');
		const actionsHeader = riasTable.getByRole('columnheader').nth(7);
		const archiveStatusControl = actionsHeader
			.getByRole('button', { name: notArchivedLabel })
			.or(actionsHeader.getByRole('combobox'))
			.or(actionsHeader.getByText(notArchivedLabel).locator('..'));
		const archiveStatusList = page.getByRole('listbox').last();
		const notArchivedOption = page.getByRole('option', { name: notArchivedLabel }).last();
		const archivedOption = page.getByRole('option', { name: archivedLabel }).last();

		const openArchiveStatusMenu = async () => {
			await expect(archiveStatusControl.first()).toBeVisible();
			await archiveStatusControl.first().click();
			await expect(archiveStatusList.or(page.getByRole('menu')).last()).toBeVisible();
		};

		const selectArchiveStatus = async (optionLocator, expectedLabel) => {
			await openArchiveStatusMenu();
			await expect(optionLocator).toBeVisible();
			await optionLocator.click();
			await expect(archiveStatusControl.first()).toContainText(expectedLabel);
		};

		const getFirstPopulatedRow = async () => {
			const rowCount = await dataRows.count();
			for (let index = 0; index < rowCount; index += 1) {
				const row = dataRows.nth(index);
				const crd = (await row.locator('td').nth(0).textContent())?.trim() || '';
				const businessName = (await row.locator('td').nth(1).textContent())?.trim() || '';
				if (crd && businessName) {
					return { row, crd, businessName };
				}
			}

			return null;
		};

		await test.step('Step 6: Archive one RIA and verify it appears in the archived view', async () => {
			await expect(riasTable).toBeVisible();
			await expect(dataRows.first()).toBeVisible();
			await expect(actionsHeader).toContainText(/actions/i);

			await expect(archiveStatusControl.first()).toBeVisible();
			await expect(archiveStatusControl.first()).toContainText(notArchivedLabel);

			await selectArchiveStatus(notArchivedOption, notArchivedLabel);

			await expect.poll(getFirstPopulatedRow).not.toBeNull();
			const populatedRow = await getFirstPopulatedRow();
			if (!populatedRow) {
				throw new Error('Expected at least one populated RIA row in the not archived view.');
			}

			const { row: targetRow, crd: targetCrd } = populatedRow;
			await expect(targetRow).toBeVisible();

			const actionsCell = targetRow.locator('td').last();
			const archiveButtonByName = actionsCell.getByRole('button', { name: /archive ria/i });
			const visibleActionButtons = actionsCell.locator('button:visible');
			const archiveButton = (await archiveButtonByName.count()) > 0 ? archiveButtonByName.first() : visibleActionButtons.nth(1);

			await expect(visibleActionButtons).toHaveCount(2);
			await expect(archiveButton).toBeVisible();
			await archiveButton.click();

			await expect(page.getByText(archiveSuccessMessage).last()).toBeVisible();

			await selectArchiveStatus(archivedOption, archivedLabel);
			await crdFilterField.fill('');
			await crdFilterField.fill(targetCrd);
			await crdFilterField.press('Enter');
			await expect(crdFilterField).toHaveValue(targetCrd);

			const archivedTargetRow = dataRows.filter({ has: page.getByText(targetCrd, { exact: true }) }).first();
			await expect(archivedTargetRow).toBeVisible({ timeout: 15000 });
			await expect(archivedTargetRow.locator('td').nth(0)).toContainText(targetCrd);

			const archivedActionsCell = archivedTargetRow.locator('td').last();
			const unarchiveButtonByName = archivedActionsCell.getByRole('button', { name: /unarchive ria/i });
			const archivedActionButtons = archivedActionsCell.locator('button:visible');
			const unarchiveButton = (await unarchiveButtonByName.count()) > 0
				? unarchiveButtonByName.first()
				: archivedActionButtons.nth(1);

			await expect(unarchiveButton).toBeVisible();
			await unarchiveButton.click();
			await expect(page.getByText(unarchiveSuccessMessage).last()).toBeVisible();

			await selectArchiveStatus(notArchivedOption, notArchivedLabel);
			await crdFilterField.fill('');
			await crdFilterField.fill(targetCrd);
			await crdFilterField.press('Enter');
			await expect(crdFilterField).toHaveValue(targetCrd);

			const restoredTargetRow = dataRows.filter({ has: page.getByText(targetCrd, { exact: true }) }).first();
			await expect(restoredTargetRow).toBeVisible({ timeout: 15000 });
			await expect(restoredTargetRow.locator('td').nth(0)).toContainText(targetCrd);
		});

		await test.step('Step 7: Log out so the test remains independent', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
	});
});
