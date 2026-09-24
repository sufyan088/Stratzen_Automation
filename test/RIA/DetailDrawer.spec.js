const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Detail Drawer', () => {
	test('TC_VerifyRiaDetailDrawerOpensFromListRow', async ({ page }) => {
		test.setTimeout(120000);

		const email = 'SZ_AutoQA@stratzen.ai';
		const passwordValue = 'StratzenAutomation123';

		await page.goto('https://demoapp.stratzen.ai/login');
		await expect(page).toHaveURL(/login/);

		const emailField = page.locator('input[type="email"]');
		await expect(emailField).toBeVisible();
		await emailField.fill(email);

		const passwordField = page.locator('input[type="password"]');
		await expect(passwordField).toBeVisible();
		await passwordField.fill(passwordValue);

		await page.getByRole('button', { name: /sign in/i }).click();
		await page.waitForLoadState('networkidle');
		await expect(page).not.toHaveURL(/login/);
		await expect(page).toHaveURL(/summary/);

		const riasLink = page.getByRole('link', { name: 'RIAs', exact: true });
		await expect(riasLink).toBeVisible({ timeout: 15000 });
		await riasLink.click();
		await expect(page).toHaveURL(/\/rias$/);

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

		const {
			row: targetRow,
			crd: selectedCrd,
			businessName: selectedBusinessName,
		} = selectedRow;

		await expect(targetRow).toBeVisible();
		await targetRow.locator('td').nth(1).click();

		const drawer = page
			.locator('[role="dialog"], [role="complementary"], aside')
			.filter({ has: page.getByText(selectedBusinessName, { exact: false }) })
			.first();

		await expect(drawer).toBeVisible({ timeout: 15000 });
		await expect(drawer.getByText(selectedBusinessName, { exact: false }).first()).toBeVisible();
		await expect(drawer.getByText(selectedCrd, { exact: false }).first()).toBeVisible();
		await expect(drawer).toContainText(selectedBusinessName);
		await expect(drawer).toContainText(selectedCrd);

		const labelledCloseButton = drawer.getByRole('button', {
			name: /close drawer|close|dismiss|x/i,
		});
		const closeButton = (await labelledCloseButton.count()) > 0
			? labelledCloseButton.first()
			: drawer.locator('header button:visible').last();

		await expect(closeButton).toBeVisible();
		await closeButton.click();

		await expect(drawer).not.toBeVisible({ timeout: 15000 });
		await expect(riasTable).toBeVisible();
	});
});
