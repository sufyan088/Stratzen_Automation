import { test, expect } from '@playwright/test';
import {
	getTestData,
	completeSignInWithOptionalOutlookSso,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from './mammothhai-playwright-helpers.js';

test.describe('RIA Module - Search Filters', () => {
	test.describe.configure({ timeout: 90000 });
	test('TC_VerifyColumnSearchFieldsAreAvailableAndFunctional', async ({ page }) => {
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
		let targetCrd = '';
		let targetBusinessName = '';
		let businessNameFragment = '';

		// Step 6: Verify the CRD search filter works.
		await test.step('Step 6: Verify the CRD search filter works', async () => {
			await expect(riasTable).toBeVisible();
			await expect(crdFilter).toBeVisible();

			const initialRowCount = await dataRows.count();
			expect(initialRowCount).toBeGreaterThan(1);

			const crdCells = page.locator('table tbody tr td:nth-child(1) p');
			const businessNameCells = page.locator('table tbody tr td:nth-child(2) p');
			let firstVisibleCrd = '';
			let firstVisibleBusinessName = '';
			for (let attempt = 0; attempt < 30; attempt += 1) {
				firstVisibleCrd = ((await crdCells.first().textContent()) || '').trim();
				firstVisibleBusinessName = ((await businessNameCells.first().textContent()) || '').trim();
				if (firstVisibleCrd && firstVisibleBusinessName) {
					break;
				}
				await page.waitForTimeout(1000);
			}

			expect(firstVisibleCrd).not.toBe('');
			expect(firstVisibleBusinessName).not.toBe('');

			for (let rowIndex = 0; rowIndex < initialRowCount; rowIndex += 1) {
				const row = dataRows.nth(rowIndex);
				const currentCrd = ((await row.locator('td').nth(0).locator('p').first().textContent()) || '').trim();
				const currentBusinessName = ((await row.locator('td').nth(1).locator('p').first().textContent()) || '').trim();

				if (!currentCrd || !currentBusinessName || currentCrd === 'No results found') {
					continue;
				}

				targetCrd = currentCrd;
				targetBusinessName = currentBusinessName;
				break;
			}

			expect(targetCrd).not.toBe('');
			expect(targetBusinessName).not.toBe('');

			const businessNameWords = targetBusinessName.split(/\s+/).filter(Boolean);
			businessNameFragment = businessNameWords.slice(0, 2).join(' ') || targetBusinessName;

			await crdFilter.fill(targetCrd);
			await expect(dataRows).toHaveCount(1);
			await expect(dataRows.first().locator('td').nth(0)).toHaveText(targetCrd);

			await crdFilter.clear();
			await expect(crdFilter).toHaveValue('');
			await expect(dataRows).not.toHaveCount(1);
			expect(await dataRows.count()).toBeGreaterThan(1);
		});

		// Step 7: Verify the Business Name search filter works.
		await test.step('Step 7: Verify the Business Name search filter works', async () => {
			await expect(businessNameFilter).toBeVisible();
			expect(businessNameFragment).not.toBe('');
			await businessNameFilter.fill(businessNameFragment);
			await expect(dataRows).toHaveCount(1);
			await expect(dataRows.first().locator('td').nth(1)).toContainText(targetBusinessName);

			await businessNameFilter.clear();
			await expect(businessNameFilter).toHaveValue('');
			await expect(dataRows).not.toHaveCount(1);
			expect(await dataRows.count()).toBeGreaterThan(1);
		});

		// Step 8: Logout from the application.
		await test.step('Step 8: Logout from the application', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
	});
});
