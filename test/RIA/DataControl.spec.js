import { test, expect } from '@playwright/test';
import {
	getTestData,
	completeSignInWithOptionalOutlookSso,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from './mammothhai-playwright-helpers.js';

test.describe('RIA Module - Data Table Controls', () => {
	test.describe.configure({ timeout: 90000 });
	test('TC_VerifyRiaDataTableControlsAndColumnVisibility', async ({ page }) => {
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

		const columnsButton = page.getByRole('button', { name: 'Columns', exact: true });
		const filtersButton = page.getByRole('button', { name: 'Filters', exact: true });
		const densityButton = page.getByRole('button', { name: 'Density', exact: true });
		const exportButton = page.getByRole('button', { name: /^Export\b/i }).first();
		const riasTable = page.locator('table').first();
		const tableHeaders = riasTable.getByRole('columnheader');
		const columnsPopup = page.getByRole('menu').last();
		const columnsResetButton = columnsPopup.getByRole('button', { name: 'RESET', exact: true });
		const crdToggle = columnsPopup.getByRole('checkbox', { name: /CRD/i }).first();
		const businessNameToggle = columnsPopup.getByRole('checkbox', { name: /Business Name/i }).first();

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
			await page.getByRole('link', { name: 'RIAs', exact: true }).click();
			await expect(page).toHaveURL(/\/rias$/);
			await expect(page.getByRole('heading', { name: 'Explore RIAs', exact: true })).toBeVisible();
		});

		// Step 6: Verify toolbar controls are visible on the RIAs page.
		await test.step('Step 6: Verify toolbar controls are visible on the RIAs page', async () => {
			await expect(riasTable).toBeVisible();
			await expect(tableHeaders.first()).toBeVisible();

			await columnsButton.scrollIntoViewIfNeeded();
			await expect(columnsButton).toBeVisible();
			await expect(filtersButton).toBeVisible();
			await expect(densityButton).toBeVisible();
			await expect(exportButton).toBeVisible();
		});

		// Step 7: Open the Columns popup and verify column toggles are available.
		await test.step('Step 7: Open the Columns popup and verify column toggles are available', async () => {
			const riasUrl = page.url();
			await columnsButton.click();
			await expect(columnsPopup).toBeVisible();
			await expect(page).toHaveURL(riasUrl);
			await expect(riasTable).toBeVisible();

			await expect(crdToggle).toBeVisible();
			await expect(businessNameToggle).toBeVisible();

			if (!(await crdToggle.isChecked())) {
				await crdToggle.click({ force: true });
			}
			await expect(crdToggle).toBeChecked();

			if (!(await businessNameToggle.isChecked())) {
				await businessNameToggle.click({ force: true });
			}
			await expect(businessNameToggle).toBeChecked();
		});

		// Step 8: Uncheck (disable) the CRD column option.
		await test.step('Step 8: Uncheck the CRD column option', async () => {
			await expect(crdToggle).toBeVisible();
			if (await crdToggle.isChecked()) {
				await crdToggle.click({ force: true });
			}
			await expect(crdToggle).not.toBeChecked();
		});

		// Step 9: Uncheck (disable) the Business Name column option.
		await test.step('Step 9: Uncheck the Business Name column option', async () => {
			await expect(businessNameToggle).toBeVisible();
			if (await businessNameToggle.isChecked()) {
				await businessNameToggle.click({ force: true });
			}
			await expect(businessNameToggle).not.toBeChecked();
		});

		// Step 10: Verify the unchecked columns are hidden from the table.
		await test.step('Step 10: Verify the unchecked columns are hidden from the table', async () => {
			await expect
				.poll(async () => await riasTable.getByRole('columnheader').filter({ hasText: 'CRD' }).count())
				.toBe(0);
			await expect
				.poll(async () => await riasTable.getByRole('columnheader').filter({ hasText: 'Business Name' }).count())
				.toBe(0);
		});

		// Step 11: Reset the column selections to the default state.
		await test.step('Step 11: Reset the column selections to the default state', async () => {
			await expect(columnsPopup).toBeVisible();
			await columnsResetButton.click();
		});

		// Step 12: Close the Columns popup after resetting the defaults.
		await test.step('Step 12: Close the Columns popup after resetting the defaults', async () => {
			await page.keyboard.press('Escape');
			await expect(columnsPopup).toBeHidden();
		});

		// Step 13: Verify the default columns are visible again.
		await test.step('Step 13: Verify the default columns are visible again', async () => {
			await expect(riasTable.getByRole('columnheader').filter({ hasText: 'Business Name' })).toBeVisible();
		});

		// Step 14: Logout from the application.
		await test.step('Step 14: Logout from the application', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
	});
});
