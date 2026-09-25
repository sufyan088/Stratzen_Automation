const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Search Filters', () => {
	test('TC_VerifyColumnSearchFieldsAreAvailableAndFunctional', async ({ page }) => {
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
		const targetCrd = '147746';
		const businessNameFragment = 'HARTFORD FUNDS';

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
		const headerCells = riasTable.getByRole('columnheader');
		const dataRows = riasTable.locator('tbody tr');
		const crdHeader = headerCells.nth(0);
		const businessNameHeader = headerCells.nth(1);
		const crdFilter = crdHeader.getByRole('textbox', { name: /filter by crd/i });
		const businessNameFilter = businessNameHeader.getByRole('textbox', {
			name: /filter by business name/i,
		});

		await test.step('Step 6: Verify the CRD search filter works', async () => {
			await expect(riasTable).toBeVisible();
			await expect(crdFilter).toBeVisible();

			const initialRowCount = await dataRows.count();
			expect(initialRowCount).toBeGreaterThan(1);

			await crdFilter.fill(targetCrd);
			await expect(dataRows).toHaveCount(1);
			await expect(dataRows.first().locator('td').nth(0)).toHaveText(targetCrd);

			await crdFilter.clear();
			await expect(crdFilter).toHaveValue('');
			await expect(dataRows).not.toHaveCount(1);
			expect(await dataRows.count()).toBeGreaterThan(1);
		});

		await test.step('Step 7: Verify the Business Name search filter works', async () => {
			await expect(businessNameFilter).toBeVisible();
			await businessNameFilter.fill(businessNameFragment);
			await expect(dataRows).toHaveCount(1);
			await expect(dataRows.first().locator('td').nth(1)).toContainText(businessNameFragment);

			await businessNameFilter.clear();
			await expect(businessNameFilter).toHaveValue('');
			await expect(dataRows).not.toHaveCount(1);
			expect(await dataRows.count()).toBeGreaterThan(1);
		});

		await test.step('Step 8: Log out so the test remains independent', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
	});
});
