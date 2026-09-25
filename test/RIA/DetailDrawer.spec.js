const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Detail Drawer', () => {
	test('TC_VerifyRiaDetailDrawerOpensFromListRow', async ({ page }) => {
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

		await test.step('Step 6: Open a populated RIA detail drawer and verify its contents', async () => {
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

		await test.step('Step 7: Log out so the test remains independent', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
	});
});
