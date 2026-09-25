const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Notes In Detail Drawer', () => {
	test('TC_VerifyNotesAddEditDeleteAndExpandCollapseInDetailDrawer', async ({ page }) => {
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
		const noteText = 'RIA TEST NOTE ADDED';
		const updatedNoteText = 'RIA TEST NOTE UPDATED';

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

			const riasLink = page.getByRole('link', { name: 'RIAs', exact: true });
			await expect(riasLink).toBeVisible({ timeout: 15000 });
			await riasLink.click();
			await expect(page).toHaveURL(/\/rias$/);
		});

		const riasTable = page.locator('table').first();
		const dataRows = riasTable.locator('tbody tr');

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

		await expect(riasTable).toBeVisible();
		await expect(dataRows.first()).toBeVisible();
		await expect.poll(getFirstPopulatedRow).not.toBeNull();

		const selectedRow = await getFirstPopulatedRow();
		if (!selectedRow) {
			throw new Error('Expected at least one populated RIA row in the list view.');
		}

		const { row: targetRow, businessName: selectedBusinessName } = selectedRow;
		await targetRow.locator('td').nth(1).click();

		const drawer = page
			.locator('[role="dialog"], [role="complementary"], aside')
			.filter({ has: page.getByText(selectedBusinessName, { exact: false }) })
			.first();

		await expect(drawer).toBeVisible({ timeout: 15000 });

		const notesToggle = drawer.getByRole('button', { name: /notes/i }).first();
		const noteComposer = drawer.getByPlaceholder('Type your note content here...').last();
		const notesRegion = noteComposer.locator('xpath=ancestor::*[@role="region"][1]');
		const composerInputRoot = noteComposer.locator('xpath=ancestor::div[contains(@class,"MuiInputBase-root")][1]');
		const addNoteButton = drawer.getByRole('button', { name: /save \(ctrl\+enter\)/i }).last();
		const getNoteTextLocator = (text) => drawer.locator('p').filter({ hasText: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
		const getNoteRow = (text) => drawer.locator(`div:has(> p:has-text("${text.replace(/"/g, '\\"')}") )`).first();
		const deleteMatchingNotes = async (text) => {
			for (let attempt = 0; attempt < 5; attempt += 1) {
				const matchingNotes = getNoteTextLocator(text);
				const count = await matchingNotes.count();
				if (count === 0) {
					return;
				}

				const noteRow = getNoteRow(text);
				await noteRow.hover();
				await noteRow.locator('button.nc-delete').first().click();

				const confirmDeleteButton = page
					.getByRole('button', { name: /delete|confirm|yes/i })
					.filter({ hasNotText: /^save/i })
					.first();

				if (await confirmDeleteButton.isVisible().catch(() => false)) {
					await confirmDeleteButton.click();
				}

				await expect(matchingNotes).toHaveCount(count - 1, { timeout: 15000 });
			}
		};

		await test.step('Step 6: Add, edit, delete, and collapse notes in the detail drawer', async () => {
			await expect(notesToggle).toBeVisible();
			await expect(notesRegion).toBeVisible();
			await expect(noteComposer).toBeVisible();

			await deleteMatchingNotes(noteText);
			await deleteMatchingNotes(updatedNoteText);

			const composerClassBeforeFocus = await composerInputRoot.getAttribute('class');

			await noteComposer.click();
			await expect(noteComposer).toBeFocused();
			await expect(composerInputRoot).toHaveClass(/Mui-focused/);
			if (composerClassBeforeFocus) {
				expect(composerClassBeforeFocus.includes('Mui-focused')).toBe(false);
			}

			await noteComposer.fill(noteText);
			await expect(noteComposer).toHaveValue(noteText);
			await expect(addNoteButton).toBeEnabled();

			await addNoteButton.click();

			const addedNoteText = getNoteTextLocator(noteText).first();
			await expect(addedNoteText).toBeVisible({ timeout: 15000 });
			await expect(addedNoteText).toHaveText(noteText);
			await expect(noteComposer).toHaveValue('');

			const addedNoteRow = getNoteRow(noteText);
			await addedNoteRow.hover();
			const editButton = addedNoteRow.locator('button.nc-edit').first();
			const deleteButton = addedNoteRow.locator('button.nc-delete').first();

			await expect(editButton).toBeVisible();
			await expect(deleteButton).toBeVisible();

			await editButton.click();

			const inlineEditTextarea = drawer.locator('textarea[placeholder="Type your note content here..."]').first();
			await expect(inlineEditTextarea).toBeVisible({ timeout: 15000 });
			await expect(inlineEditTextarea).toHaveValue(noteText);
			await inlineEditTextarea.fill(updatedNoteText);
			await expect(inlineEditTextarea).toHaveValue(updatedNoteText);

			const inlineEditRow = inlineEditTextarea.locator('xpath=ancestor::div[contains(@class,"MuiStack-root")][1]');
			const confirmEditButton = inlineEditRow.locator('button').nth(1);

			await expect(confirmEditButton).toBeVisible();
			await confirmEditButton.click();

			const updatedNoteRow = getNoteRow(updatedNoteText);
			await expect(updatedNoteRow.locator('p', { hasText: updatedNoteText })).toBeVisible({ timeout: 15000 });
			await expect(getNoteTextLocator(noteText)).toHaveCount(0);

			await updatedNoteRow.hover();
			await expect(updatedNoteRow.locator('button.nc-edit').first()).toBeVisible();
			const updatedDeleteButton = updatedNoteRow.locator('button.nc-delete').first();
			await expect(updatedDeleteButton).toBeVisible();

			await updatedDeleteButton.click();

			const confirmDeleteButton = page
				.getByRole('button', { name: /delete|confirm|yes/i })
				.filter({ hasNotText: /^save/i })
				.first();

			if (await confirmDeleteButton.isVisible().catch(() => false)) {
				await confirmDeleteButton.click();
			}

			await expect(getNoteTextLocator(updatedNoteText)).toHaveCount(0, { timeout: 15000 });

			await notesToggle.click();
			await expect(notesRegion).not.toBeVisible({ timeout: 15000 });
			await expect(drawer).toBeVisible();

			await notesToggle.click();
			await expect(notesRegion).toBeVisible({ timeout: 15000 });
			await expect(noteComposer).toBeVisible();
		});

		await test.step('Step 7: Log out so the test remains independent', async () => {
			const drawerCloseButton = drawer.getByRole('button', {
				name: /close drawer|close|dismiss|x/i,
			}).first();

			if (await drawerCloseButton.isVisible().catch(() => false)) {
				await drawerCloseButton.click();
				await expect(drawer).not.toBeVisible({ timeout: 15000 });
			}

			await expect(page.getByRole('status')).toHaveCount(0, { timeout: 15000 });
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
	});
});
