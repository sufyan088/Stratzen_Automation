const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Detail Drawer Web Links', () => {
	test('TC_VerifyDetailDrawerHeaderWebLinksAreClickableAndRenderCorrectly', async ({ page }) => {
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

		// Step 1: Navigate to the login page.
		await test.step('Step 1: Navigate to the login page', async () => {
			await page.goto(buildUrl('/login'), {
				waitUntil: 'domcontentloaded',
				timeout: 90000,
			});
			await expect(page).toHaveURL(/login/);
		});

		// Step 2: Enter the email address.
		await test.step('Step 2: Enter the email address', async () => {
			const emailTextbox = page.getByRole('textbox', { name: /email/i });
			const emailField = (await emailTextbox.count())
				? emailTextbox.first()
				: page.locator('input[type="email"]').first();
			await expect(emailField).toBeVisible();
			await emailField.fill(email);
		});

		// Step 3: Enter the password.
		await test.step('Step 3: Enter the password', async () => {
			const passwordField = page.locator('input[type="password"]').first();
			await expect(passwordField).toBeVisible();
			await passwordField.fill(passwordValue);
		});

		// Step 4: Click the Sign In button.
		await test.step('Step 4: Click the Sign In button', async () => {
			await page.getByRole('button', { name: /sign in/i }).click();
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

		// Step 6: Open a RIA drawer with web links and verify they navigate correctly.
		await test.step('Step 6: Open a RIA drawer with web links and verify they navigate correctly', async () => {
			await expect(riasTable).toBeVisible();
			const businessNameCells = page.locator('table tbody tr td:nth-child(2) p');
			let firstVisibleName = '';
			for (let attempt = 0; attempt < 30; attempt += 1) {
				firstVisibleName = ((await businessNameCells.first().textContent()) || '').trim();
				if (firstVisibleName) {
					break;
				}
				await page.waitForTimeout(1000);
			}
			expect(firstVisibleName).not.toBe('');

			const rowCount = await dataRows.count();
			let selectedDrawer = null;
			let selectedRecord = null;
			let selectedDrawerLinks = [];
			let externalLinks = null;

			for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
				const targetRow = dataRows.nth(rowIndex);
				const crdCell = targetRow.locator('td').nth(0).locator('p').first();
				const businessNameCell = targetRow.locator('td').nth(1).locator('p').first();

				if (!(await crdCell.isVisible().catch(() => false)) || !(await businessNameCell.isVisible().catch(() => false))) {
					continue;
				}

				const crd = ((await crdCell.textContent()) || '').trim();
				const businessName = ((await businessNameCell.textContent()) || '').trim();

				if (!crd || !businessName) {
					continue;
				}

				await businessNameCell.click();

				const candidateDrawer = page
					.locator('[role="dialog"], [role="complementary"], aside')
					.filter({ has: page.getByText(businessName, { exact: false }) })
					.first();

				await expect(candidateDrawer).toBeVisible({ timeout: 15000 });
				await expect(candidateDrawer).toContainText(businessName);
				await expect(candidateDrawer).toContainText(crd);

				const candidateLinks = candidateDrawer.locator('a[href]');
				let candidateLinkCount = 0;
				for (let attempt = 0; attempt < 5; attempt += 1) {
					candidateLinkCount = await candidateLinks.count();
					if (candidateLinkCount > 0) {
						break;
					}
					await page.waitForTimeout(1000);
				}

				const candidateDrawerLinks = [];
				for (let linkIndex = 0; linkIndex < candidateLinkCount; linkIndex += 1) {
					const link = candidateLinks.nth(linkIndex);
					const href = ((await link.getAttribute('href')) || '').trim();

					if (!/^https?:\/\//i.test(href)) {
						continue;
					}

					candidateDrawerLinks.push({
						index: linkIndex,
						href,
						text: ((await link.textContent()) || '').trim(),
					});
				}

				if (candidateDrawerLinks.length > 0) {
					selectedDrawer = candidateDrawer;
					selectedRecord = { crd, businessName };
					selectedDrawerLinks = candidateDrawerLinks;
					externalLinks = candidateLinks;
					break;
				}

				const labelledCloseButton = candidateDrawer.getByRole('button', {
					name: /close window|close drawer|close|dismiss|x/i,
				});
				const closeButton = (await labelledCloseButton.count()) > 0
					? labelledCloseButton.first()
					: candidateDrawer.locator('header button:visible').last();
				await expect(closeButton).toBeVisible();
				await closeButton.click();
				await expect(candidateDrawer).not.toBeVisible({ timeout: 15000 });
			}

			if (!selectedDrawer || !selectedRecord || !externalLinks || selectedDrawerLinks.length === 0) {
				throw new Error('Expected at least one RIA row whose detail drawer contains external web links.');
			}

			await expect(selectedDrawer).toContainText(selectedRecord.businessName);
			await expect(selectedDrawer).toContainText(selectedRecord.crd);

			for (const webLink of selectedDrawerLinks) {
				const link = externalLinks.nth(webLink.index);
				await expect(link).toBeVisible();
				await expect(link).toBeEnabled();
				expect(webLink.href).toMatch(/^https?:\/\//i);
				expect(webLink.href).not.toMatch(/demoapp\.stratzen\.ai/i);

				const popupPromise = page.waitForEvent('popup', { timeout: 8000 }).catch(() => null);
				const currentUrlBeforeClick = page.url();

				await link.click();

				const popupPage = await popupPromise;
				if (popupPage) {
					await popupPage.waitForLoadState('domcontentloaded');
					const popupUrl = popupPage.url();
					expect(popupUrl === 'chrome-error://chromewebdata/' || /^https?:\/\//i.test(popupUrl)).toBeTruthy();
					expect(popupUrl).not.toMatch(/demoapp\.stratzen\.ai/i);
					await popupPage.close();
					continue;
				}

				await page.waitForLoadState('domcontentloaded');
				const navigatedUrl = page.url();
				expect(navigatedUrl === 'chrome-error://chromewebdata/' || /^https?:\/\//i.test(navigatedUrl)).toBeTruthy();
				expect(navigatedUrl).not.toBe(currentUrlBeforeClick);
				await page.goBack();
				await page.waitForLoadState('networkidle');
				await expect(page).toHaveURL(currentUrlBeforeClick);

				const restoredDrawer = page.locator('[role="dialog"]:visible, [role="complementary"]:visible, aside:visible').first();
				await expect(restoredDrawer).toBeVisible({ timeout: 15000 });
			}

			const labelledCloseButton = selectedDrawer.getByRole('button', {
				name: /close window|close drawer|close|dismiss|x/i,
			});
			const closeButton = (await labelledCloseButton.count()) > 0
				? labelledCloseButton.first()
				: selectedDrawer.locator('header button:visible').last();
			await expect(closeButton).toBeVisible();
			await closeButton.click();
			await expect(selectedDrawer).not.toBeVisible({ timeout: 15000 });
			await expect(riasTable).toBeVisible();
		});

		// Step 7: Log out so the test remains independent.
		await test.step('Step 7: Log out so the test remains independent', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
	});
});
