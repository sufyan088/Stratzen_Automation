import { test, expect } from '@playwright/test';
import {
	getTestData,
	completeSignInWithOptionalOutlookSso,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from './mammothhai-playwright-helpers.js';

test.describe('RIA Module - Detail Drawer', () => {
	test('TC_VerifyRiaDetailDrawerOpensFromListRow', async ({ page }) => {
		test.setTimeout(120000);
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

		if (!destinationUrl) throw new Error('Missing destination_url__step1 / BASEURL test data.');
		if (!authUsername || !password) throw new Error('Missing username or password in project.use or environment variables.');

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

		// Step 6: Open a populated RIA detail drawer and verify its contents.
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

		// Step 7: Logout from the application.
		await test.step('Step 7: Logout from the application', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
	});
});
