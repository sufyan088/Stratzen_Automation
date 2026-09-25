const { test, expect } = require('@playwright/test');

test.describe('RIA Module - List View', () => {
	test('TC_VerifyDefaultRiaTableColumnsAndRowPresentation', async ({ page }) => {
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

		await test.step('Step 5: Verify login completes and open RIAs', async () => {
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/summary/);
			await page.getByRole('link', { name: 'RIAs', exact: true }).click();
			await expect(page).toHaveURL(/\/rias$/);
		});

		const pageHeading = page.getByRole('heading', { name: 'Explore RIAs', exact: true });
		const savedFiltersControl = page.getByRole('button', {
			name: /saved filters/i,
		});
		const adBotControl = page.getByRole('button', { name: /open chat help/i });
		const adBotLabel = page.getByText('Ad-Bot', { exact: true });
		const riasTable = page.locator('table').first();
		const tableHeaders = riasTable.getByRole('columnheader');

		await test.step('Step 6: Verify the default RIAs list view content', async () => {
			await expect(pageHeading).toBeVisible();
			await expect(page.locator('main')).toContainText(/find|compare|registered investment advisors/i);
			await expect(savedFiltersControl).toBeVisible();
			await expect(savedFiltersControl).toBeEnabled();
			await expect(adBotControl).toBeVisible();
			await expect(adBotLabel).toBeVisible();
			await expect(riasTable).toBeVisible();

			for (const [index, columnName] of [
				'CRD',
				'Business Name',
				'City',
				'State',
				'AUM',
				'Custodian',
				'Last Filing',
				'Actions',
			].entries()) {
				const headerCell = tableHeaders.nth(index);
				await expect(headerCell).toBeVisible();
				await expect(headerCell).toContainText(columnName);
			}

			const adBotBox = await adBotControl.boundingBox();
			const tableBox = await riasTable.boundingBox();
			if (!adBotBox || !tableBox) {
				throw new Error('Expected Ad-Bot control and RIAs table to have bounding boxes.');
			}
			expect(adBotBox.x).toBeGreaterThan(tableBox.x + tableBox.width / 2);
			expect(adBotBox.y + adBotBox.height).toBeLessThanOrEqual(tableBox.y + 20);
		});

		await test.step('Step 7: Log out so the test remains independent', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
	});
});
