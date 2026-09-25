const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Detail Drawer Web Links', () => {
	test('TC_VerifyDetailDrawerHeaderWebLinksAreClickableAndRenderCorrectly', async ({ page, context }) => {
		test.setTimeout(180000);
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

		const getCloseButton = (drawer) => {
			const labelledCloseButton = drawer.getByRole('button', {
				name: /close drawer|close|dismiss|x/i,
			});

			return labelledCloseButton.or(drawer.locator('header button:visible').last()).first();
		};

		const getDrawerWebLinks = async (drawer) => {
			const links = drawer.locator('a[href]:visible');
			const linkCount = await links.count();
			const webLinks = [];

			for (let index = 0; index < linkCount; index += 1) {
				const link = links.nth(index);
				const href = (await link.getAttribute('href'))?.trim() || '';
				const linkText = ((await link.textContent()) || '').trim();

				if (!href || /^tel:/i.test(href) || /^mailto:/i.test(href)) {
					continue;
				}

				webLinks.push({
					index,
					href,
					text: linkText,
				});
			}

			return { links, webLinks };
		};

		await test.step('Step 6: Open a RIA drawer with web links and verify they navigate correctly', async () => {
			await expect(riasTable).toBeVisible();
			await expect(dataRows.first()).toBeVisible();
			await expect
				.poll(async () => {
					const rowCount = await dataRows.count();
					for (let index = 0; index < rowCount; index += 1) {
						const row = dataRows.nth(index);
						const crd = (await row.locator('td').nth(0).textContent())?.trim() || '';
						const businessName = (await row.locator('td').nth(1).textContent())?.trim() || '';
						if (crd && businessName) {
							return true;
						}
					}
					return false;
				})
				.toBeTruthy();

			let selectedRecord = null;
			let selectedDrawer = null;
			let selectedDrawerLinks = null;

			const rowCount = await dataRows.count();
			let currentRowIndex = 0;

			while (currentRowIndex < rowCount) {
				const row = dataRows.nth(currentRowIndex);
				const crd = (await row.locator('td').nth(0).textContent())?.trim() || '';
				const businessName = (await row.locator('td').nth(1).textContent())?.trim() || '';

				if (!crd || !businessName) {
					currentRowIndex += 1;
					continue;
				}

				await expect(row).toBeVisible();
				await row.click();

				const drawer = page
					.locator('[role="dialog"], [role="complementary"], aside')
					.filter({ has: page.getByText(businessName, { exact: false }) })
					.first();

				await expect(drawer).toBeVisible({ timeout: 15000 });
				await expect(drawer).toContainText(businessName);
				await expect(drawer).toContainText(crd);

				try {
					await expect
						.poll(async () => (await getDrawerWebLinks(drawer)).webLinks.length, { timeout: 5000 })
						.toBeGreaterThan(0);
				} catch {
					// This row has no usable non-phone links after the drawer finished rendering.
				}

				const drawerLinks = await getDrawerWebLinks(drawer);
				if (drawerLinks.webLinks.length > 0) {
					selectedRecord = { crd, businessName };
					selectedDrawer = drawer;
					selectedDrawerLinks = drawerLinks;
					break;
				}

				const closeButton = getCloseButton(drawer);
				await expect(closeButton).toBeVisible();
				await closeButton.click();
				await expect(drawer).not.toBeVisible({ timeout: 15000 });
				currentRowIndex += 1;
			}

			if (!selectedRecord || !selectedDrawer || !selectedDrawerLinks) {
				throw new Error('Expected at least one RIA detail drawer header with a non-phone web link.');
			}

			await expect(selectedDrawer).toContainText(selectedRecord.businessName);
			await expect(selectedDrawer).toContainText(selectedRecord.crd);

			for (const webLink of selectedDrawerLinks.webLinks) {
				const link = selectedDrawerLinks.links.nth(webLink.index);
				await expect(link).toBeVisible();
				await expect(link).toBeEnabled();

				const popupPromise = page.waitForEvent('popup', { timeout: 8000 }).catch(() => null);
				const currentUrlBeforeClick = page.url();

				await link.click();

				const popupPage = await popupPromise;
				if (popupPage) {
					await popupPage.waitForLoadState('domcontentloaded');
					expect(popupPage.url()).toMatch(/^https?:\/\//i);
					expect(popupPage.url()).not.toMatch(/demoapp\.stratzen\.ai/i);
					await popupPage.close();
					continue;
				}

				await page.waitForLoadState('domcontentloaded');
				expect(page.url()).toMatch(/^https?:\/\//i);
				expect(page.url()).not.toBe(currentUrlBeforeClick);
				await page.goBack();
				await page.waitForLoadState('networkidle');
				await expect(page).toHaveURL(currentUrlBeforeClick);

				const restoredDrawer = page
					.locator('[role="dialog"], [role="complementary"], aside')
					.filter({ has: page.getByText(selectedRecord.businessName, { exact: false }) })
					.first();
				await expect(restoredDrawer).toBeVisible({ timeout: 15000 });
			}

			const closeButton = getCloseButton(selectedDrawer);
			await expect(closeButton).toBeVisible();
			await closeButton.click();
			await expect(selectedDrawer).not.toBeVisible({ timeout: 15000 });
			await expect(riasTable).toBeVisible();
		});

		await test.step('Step 7: Log out so the test remains independent', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
	});
});
