import { test, expect } from '@playwright/test';

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
			const emailField = page.locator('input[type="email"]').first();
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

		// Step 5: Verify the Summary page loads after sign in.
		await test.step('Step 5: Verify the Summary page loads after sign in', async () => {
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/summary/);
		});

		// Step 6: Open the RIAs page.
		await test.step('Step 6: Open the RIAs page', async () => {
			const riasLink = page.getByRole('link', { name: 'RIAs', exact: true });
			await expect(riasLink).toBeVisible({ timeout: 15000 });
			await riasLink.click();
			await expect(page).toHaveURL(/\/rias$/);
		});

		const riasTable = page.locator('table').first();
		const dataRows = riasTable.locator('tbody tr');

		// Step 7: Open a RIA drawer with web links and verify they navigate correctly.
		await test.step('Step 7: Open a RIA drawer with web links and verify they navigate correctly', async () => {
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
			let selectedRowIndex = -1;
			let selectedBusinessName = '';
			let selectedCrd = '';
			let selectedDrawerLinks = [];

			for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
				const targetRow = dataRows.nth(rowIndex);
				const crdCell = targetRow.locator('td').nth(0).locator('p').first();
				const businessNameCell = targetRow.locator('td').nth(1).locator('p').first();

				if ((await crdCell.count()) === 0 || (await businessNameCell.count()) === 0) {
					continue;
				}

				const crd = ((await crdCell.textContent()) || '').trim();
				const businessName = ((await businessNameCell.textContent()) || '').trim();

				if (!crd || !businessName) {
					continue;
				}

				await businessNameCell.click();

				const candidateDrawer = page.locator('[role="dialog"]:visible, [role="complementary"]:visible, aside:visible').first();

				await expect(candidateDrawer).toBeVisible({ timeout: 15000 });
				await expect(candidateDrawer).toContainText(businessName);
				await expect(candidateDrawer).toContainText(crd);

				const candidateDrawerLinks = [];
				for (let attempt = 0; attempt < 15; attempt += 1) {
					candidateDrawerLinks.length = 0;
					const candidateLinks = candidateDrawer.locator('a[href]');
					const candidateLinkCount = await candidateLinks.count();

					for (let linkIndex = 0; linkIndex < candidateLinkCount; linkIndex += 1) {
						const link = candidateLinks.nth(linkIndex);
						const href = ((await link.getAttribute('href')) || '').trim();
						const linkVisible = await link.isVisible().catch(() => false);
						const linkEnabled = await link.isEnabled().catch(() => false);

						if (!linkVisible || !linkEnabled || !href) {
							continue;
						}

						if (/^(#|javascript:|mailto:|tel:)/i.test(href)) {
							continue;
						}

						const className = ((await link.getAttribute('class')) || '').trim();
						candidateDrawerLinks.push({
							index: linkIndex,
							href,
							text: ((await link.textContent()) || '').trim(),
							className,
							isIconLink: /contact-icon-link/i.test(className),
						});
					}

					if (candidateDrawerLinks.length > 0) {
						break;
					}

					const drawerText = ((await candidateDrawer.textContent()) || '').trim();
					if (!/Loading RIA details/i.test(drawerText) && attempt >= 4) {
						break;
					}

					await page.waitForTimeout(1000);
				}

				if (candidateDrawerLinks.length > 0) {
					selectedRowIndex = rowIndex;
					selectedBusinessName = businessName;
					selectedCrd = crd;
					selectedDrawerLinks = candidateDrawerLinks;
					break;
				}

				const labelledCloseButton = candidateDrawer.getByRole('button', {
					name: /close window|close drawer|close|dismiss|x/i,
				});
				let closeButton = labelledCloseButton.first();
				if ((await labelledCloseButton.count()) === 0) {
					closeButton = candidateDrawer.locator('header button:visible').last();
				}
				await expect(closeButton).toBeVisible();
				await closeButton.click();
				await expect(candidateDrawer).not.toBeVisible({ timeout: 15000 });
			}

			if (selectedRowIndex < 0 || !selectedBusinessName || !selectedCrd || selectedDrawerLinks.length === 0) {
				throw new Error('Expected at least one RIA row whose detail drawer contains external web links.');
			}

			const selectedRow = dataRows.nth(selectedRowIndex);
			const selectedDrawer = page
				.locator('[role="dialog"]:visible, [role="complementary"]:visible, aside:visible')
				.filter({ hasText: selectedBusinessName })
				.first();
			await expect(selectedDrawer).toBeVisible({ timeout: 15000 });

			await expect(selectedDrawer).toContainText(selectedBusinessName);
			await expect(selectedDrawer).toContainText(selectedCrd);
			let hasIconLink = false;
			let hasTextLink = false;
			for (let selectedLinkIndex = 0; selectedLinkIndex < selectedDrawerLinks.length; selectedLinkIndex += 1) {
				if (selectedDrawerLinks[selectedLinkIndex].isIconLink) {
					hasIconLink = true;
				} else {
					hasTextLink = true;
				}
			}
			expect(hasIconLink).toBeTruthy();
			expect(hasTextLink).toBeTruthy();

			for (let linkIndex = 0; linkIndex < selectedDrawerLinks.length; linkIndex += 1) {
				const webLink = selectedDrawerLinks[linkIndex];
				let link = selectedDrawer.locator('a[href]').nth(webLink.index);
				if ((await link.count()) === 0) {
					const matchingHrefLinks = selectedDrawer.locator(`a[href="${webLink.href.replace(/"/g, '\\"')}"]`);
					const matchingHrefCount = await matchingHrefLinks.count();
					for (let matchingIndex = 0; matchingIndex < matchingHrefCount; matchingIndex += 1) {
						const matchingLink = matchingHrefLinks.nth(matchingIndex);
						const matchingClassName = ((await matchingLink.getAttribute('class')) || '').trim();
						const matchingIsIconLink = /contact-icon-link/i.test(matchingClassName);
						if (matchingIsIconLink === webLink.isIconLink) {
							link = matchingLink;
							break;
						}
					}
				}
				await expect(link).toBeVisible();
				await expect(link).toBeEnabled();

				const currentUrlBeforeClick = page.url();
				const href = ((await link.getAttribute('href')) || '').trim();
				const target = ((await link.getAttribute('target')) || '').trim().toLowerCase();

				if (target === '_blank') {
					const popupPromise = page.waitForEvent('popup', { timeout: 15000 });
					await link.click();
					const popupPage = await popupPromise;
					await popupPage.waitForLoadState('domcontentloaded');
					const popupUrl = popupPage.url();
					expect(Boolean(popupUrl)).toBeTruthy();
					expect(popupUrl === 'chrome-error://chromewebdata/' || popupUrl !== 'about:blank').toBeTruthy();
					await popupPage.close();
				} else if (/^https?:\/\//i.test(href) || href.startsWith('/')) {
					await link.click();
					await page.waitForLoadState('domcontentloaded');
					const navigatedUrl = page.url();
					expect(Boolean(navigatedUrl)).toBeTruthy();
					expect(navigatedUrl).not.toBe(currentUrlBeforeClick);
					await page.goBack();
					await page.waitForLoadState('networkidle');
					await expect(page).toHaveURL(currentUrlBeforeClick);
					const restoredDrawerLinks = [];
					const restoredLinks = selectedDrawer.locator('a[href]');
					const restoredLinkCount = await restoredLinks.count();
					for (let restoredLinkIndex = 0; restoredLinkIndex < restoredLinkCount; restoredLinkIndex += 1) {
						const restoredLink = restoredLinks.nth(restoredLinkIndex);
						const restoredHref = ((await restoredLink.getAttribute('href')) || '').trim();
						const restoredLinkVisible = await restoredLink.isVisible().catch(() => false);
						const restoredLinkEnabled = await restoredLink.isEnabled().catch(() => false);

						if (!restoredLinkVisible || !restoredLinkEnabled || !restoredHref) {
							continue;
						}

						if (/^(#|javascript:|mailto:|tel:)/i.test(restoredHref)) {
							continue;
						}

						restoredDrawerLinks.push(restoredHref);
					}
					if (restoredDrawerLinks.length > 0) {
						await expect(selectedDrawer).toBeVisible({ timeout: 15000 });
					} else {
						await selectedRow.locator('td').nth(1).dispatchEvent('click');
						await expect(selectedDrawer).toBeVisible({ timeout: 15000 });
					}
				} else {
					await link.dispatchEvent('click');
					await expect(selectedDrawer).toBeVisible({ timeout: 15000 });
				}
			}

			const labelledCloseButton = selectedDrawer.getByRole('button', {
				name: /close window|close drawer|close|dismiss|x/i,
			});
			let closeButton = labelledCloseButton.first();
			if ((await labelledCloseButton.count()) === 0) {
				closeButton = selectedDrawer.locator('header button:visible').last();
			}
			await expect(closeButton).toBeVisible();
			await closeButton.dispatchEvent('click');
			await expect(selectedDrawer).not.toBeVisible({ timeout: 15000 });
			await expect(riasTable).toBeVisible();
		});

		// Step 8: Logout from the application.
		await test.step('Step 8: Logout from the application', async () => {
			await page.getByText('QA', { exact: true }).dispatchEvent('click');
			const logoutMenuItem = page.getByRole('menuitem', { name: 'Logout' });
			await expect(logoutMenuItem).toBeVisible();
			await logoutMenuItem.dispatchEvent('click');
			await expect(page).toHaveURL(/login/);
		});
	});
});
