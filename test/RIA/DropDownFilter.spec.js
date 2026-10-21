import { test, expect } from '@playwright/test';
import {
	getTestData,
	completeSignInWithOptionalOutlookSso,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from './mammothhai-playwright-helpers.js';

test.describe('RIA Module - Dropdown Filters', () => {
	test.describe.configure({ timeout: 90000 });
	test('TC_VerifyStateFilterDropdownAndSelection', async ({ page }) => {
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
		const targetState = 'New York';

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

		const getRiasTable = () => page.locator('table').first();
		const getDataRows = () => getRiasTable().locator('tbody tr');
		const getStateHeader = () => getRiasTable().getByRole('columnheader').nth(3);
		const getStateFilterControl = () => getStateHeader().getByRole('combobox');
		const getStateFilterList = () => page.getByRole('listbox').last();
		const getTargetStateOption = () =>
			getStateFilterList().getByRole('option', {
				name: /New York \(NY\)/i,
			});
		const getTargetStateCheckbox = () => getTargetStateOption().getByRole('checkbox');

		// Step 6: Apply the state dropdown filter and verify the rows.
		await test.step('Step 6: Apply the state dropdown filter and verify the rows', async () => {
			await expect(getRiasTable()).toBeVisible();
			expect(await getDataRows().count()).toBeGreaterThan(1);

			await expect(getStateFilterControl()).toBeVisible();
			await getStateFilterControl().click();

			await expect(getStateFilterList()).toBeVisible();
			await expect(getTargetStateOption()).toBeVisible();

			await getTargetStateCheckbox().click();
			await expect(getTargetStateCheckbox()).toBeChecked();
			await expect(getDataRows().first()).toBeVisible();
			await expect(getDataRows()).not.toHaveCount(0);
			const filteredRowCount = await getDataRows().count();
			expect(filteredRowCount).toBeGreaterThan(0);

			for (let index = 0; index < filteredRowCount; index += 1) {
				await expect(getDataRows().nth(index).locator('td').nth(3)).toHaveText(targetState);
			}
		});

		// Step 7: Clear the state dropdown filter and verify rows reset.
		await test.step('Step 7: Clear the state dropdown filter and verify rows reset', async () => {
			if (!(await getStateFilterList().isVisible())) {
				await expect(getStateFilterControl()).toBeVisible();
				await getStateFilterControl().click();
			}
			await expect(getStateFilterList()).toBeVisible();
			await expect(getTargetStateOption()).toBeVisible();
			await expect(getTargetStateCheckbox()).toBeChecked();

			await getTargetStateCheckbox().click();
			await expect(getTargetStateCheckbox()).not.toBeChecked();
			await expect(getDataRows().first()).toBeVisible();
			await expect(getDataRows()).not.toHaveCount(0);

			const clearedRowCount = await getDataRows().count();
			expect(clearedRowCount).toBeGreaterThan(0);
			await expect
				.poll(async () => {
					const rowCount = await getDataRows().count();
					for (let index = 0; index < rowCount; index += 1) {
						const stateText = (await getDataRows().nth(index).locator('td').nth(3).textContent())?.trim();
						if (stateText && stateText !== targetState) {
							return true;
						}
					}
					return false;
				})
				.toBe(true);
		});

		// Step 8: Logout from the application.
		await test.step('Step 8: Logout from the application', async () => {
			if (await getStateFilterList().isVisible().catch(() => false)) {
				await page.keyboard.press('Escape');
				await expect(getStateFilterList()).not.toBeVisible({ timeout: 15000 });
			}

			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
	});
});
