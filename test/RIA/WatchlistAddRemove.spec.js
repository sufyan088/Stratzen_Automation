import { test, expect } from '@playwright/test';
import {
	getTestData,
	completeSignInWithOptionalOutlookSso,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from './mammothhai-playwright-helpers.js';

test.describe('RIA Module - Watchlist Add / Remove', () => {
	test.describe.configure({ timeout: 120000 });
	test('TC_VerifyWatchlistAddAndRemoveControlsFromRiaList', async ({ page }) => {
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
		const riasLink = page.getByRole('link', { name: 'RIAs', exact: true });
		const riasWatchlistLink = page.getByRole('link', { name: 'RIAs Watchlist', exact: true });
		const summaryHeading = page.getByRole('heading', { name: /summary/i }).first();

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
			await expect(summaryHeading).toBeVisible({ timeout: 15000 });
			await expect(riasLink).toBeVisible({ timeout: 15000 });
			await riasLink.click();
			await expect(page).toHaveURL(/\/rias$/);
		});

		const exploreTable = page.locator('table').first();
		const exploreRows = exploreTable.locator('tbody tr');
		const exploreBusinessNameFilterField = exploreTable.getByRole('columnheader').nth(1).getByRole('textbox');

		const getFirstRowWithWatchlistAction = async () => {
			const rowCount = await exploreRows.count();
			for (let index = 0; index < rowCount; index += 1) {
				const row = exploreRows.nth(index);
				const crd = (await row.locator('td').nth(0).textContent())?.trim() || '';
				const businessName = (await row.locator('td').nth(1).textContent())?.trim() || '';
				const actionsCell = row.locator('td').last();
				const visibleActionButtons = actionsCell.locator('button:visible');
				const actionMarkup = ((await actionsCell.innerHTML()) || '').toLowerCase();
				const hasAddToWatchlistState =
					actionMarkup.includes('add to watchlist') ||
					(await actionsCell.locator('[aria-label*="Add to watchlist" i], [title*="Add to watchlist" i]').count()) > 0;
				const isAlreadyInWatchlist =
					actionMarkup.includes('remove from watchlist') ||
					(await actionsCell.locator('[aria-label*="Remove from watchlist" i], [title*="Remove from watchlist" i]').count()) > 0;

				if (!crd || !businessName) {
					continue;
				}

				if (isAlreadyInWatchlist) {
					continue;
				}

				if (!hasAddToWatchlistState) {
					continue;
				}

				return { row, crd, businessName, actionsCell, watchlistButton: visibleActionButtons.first() };
			}

			return null;
		};

		// Step 6: Add one RIA to the watchlist and verify it appears there.
		await test.step('Step 6: Add one RIA to the watchlist and verify it appears there', async () => {
			await expect(exploreTable).toBeVisible();
			await expect(exploreRows.first()).toBeVisible();

			await expect.poll(getFirstRowWithWatchlistAction).not.toBeNull();
			const candidateRow = await getFirstRowWithWatchlistAction();
			if (!candidateRow) {
				throw new Error('Expected at least one populated RIA row with a watchlist action.');
			}

			const {
				row: targetRow,
				crd: targetCrd,
				businessName: targetBusinessName,
				actionsCell: targetActionsCell,
				watchlistButton,
			} = candidateRow;

			await expect(targetRow).toBeVisible();
			await expect(targetActionsCell).toBeVisible();
			await expect(watchlistButton).toBeVisible();
			await watchlistButton.click();

			const removeWatchlistButtonInExplore = targetActionsCell.locator('button').first();
			await expect(removeWatchlistButtonInExplore).toBeVisible({ timeout: 15000 });

			await expect(riasWatchlistLink).toBeVisible({ timeout: 15000 });
			await riasWatchlistLink.click();
			await expect(page).toHaveURL(/\/rias-watchlist$/);

			const watchlistHeading = page.getByRole('heading', { name: 'RIAs Watchlist', exact: true });
			const watchlistTargetCard = page
				.locator('.kanban-card')
				.filter({ has: page.getByText(targetBusinessName, { exact: false }) })
				.filter({ has: page.getByText(targetCrd, { exact: false }) })
				.first();

			await expect(watchlistHeading).toBeVisible();
			await expect(watchlistTargetCard).toBeVisible({ timeout: 15000 });

			const removeFromWatchlistButton = watchlistTargetCard.getByRole('button', {
				name: /remove from watchlist/i,
			});
			await expect(removeFromWatchlistButton).toBeVisible();
			await removeFromWatchlistButton.click({ force: true });
			await expect(watchlistTargetCard).not.toBeVisible({ timeout: 15000 });

			await expect(riasLink).toBeVisible({ timeout: 15000 });
			await riasLink.click();
			await expect(page).toHaveURL(/\/rias$/);

			await expect(exploreTable).toBeVisible();
			await expect(exploreBusinessNameFilterField).toBeVisible({ timeout: 15000 });
			await exploreBusinessNameFilterField.fill('');
			await exploreBusinessNameFilterField.fill(targetBusinessName);
			await exploreBusinessNameFilterField.press('Enter');
			await expect(exploreBusinessNameFilterField).toHaveValue(targetBusinessName);

			const restoredExploreRow = exploreRows
				.filter({ has: page.getByText(targetCrd, { exact: true }) })
				.filter({ has: page.getByText(targetBusinessName, { exact: true }) })
				.first();
			await expect(restoredExploreRow).toBeVisible({ timeout: 15000 });
			await expect(restoredExploreRow.locator('td').nth(0)).toContainText(targetCrd);
			await expect(restoredExploreRow.locator('td').nth(1)).toContainText(targetBusinessName);

			const restoredActionsCell = restoredExploreRow.locator('td').last();
			const watchlistButtonAgain = restoredActionsCell.locator('button').first();
			await expect(watchlistButtonAgain).toBeVisible({ timeout: 15000 });
			await expect(watchlistButtonAgain).toBeEnabled();
		});

		// Step 7: Logout from the application.
		await test.step('Step 7: Logout from the application', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/login/);
		});
	});
});
