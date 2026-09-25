const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Dropdown Filters', () => {
	test('TC_VerifyStateFilterDropdownAndSelection', async ({ page }) => {
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
		const targetState = 'New York';

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

		await test.step('Step 8: Log out so the test remains independent', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
	});
});
