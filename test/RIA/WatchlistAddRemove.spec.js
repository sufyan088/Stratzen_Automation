const { test, expect } = require('@playwright/test');

test.describe('RIA Module - Watchlist Add / Remove', () => {
	test('TC_VerifyWatchlistAddAndRemoveControlsFromRiaList', async ({ page }) => {
		test.setTimeout(120000);

		const email = 'SZ_AutoQA@stratzen.ai';
		const passwordValue = 'StratzenAutomation123';
		const riasLink = page.getByRole('link', { name: 'RIAs', exact: true });
		const riasWatchlistLink = page.getByRole('link', { name: 'RIAs Watchlist', exact: true });
		const summaryHeading = page.getByRole('heading', { name: /summary/i }).first();
		await page.goto('https://demoapp.stratzen.ai/login');
		await expect(page).toHaveURL(/login/);

		await page.locator('input[type="email"]').fill(email);
		await page.locator('input[type="password"]').fill(passwordValue);
		await page.getByRole('button', { name: /sign in/i }).click();

		await page.waitForURL('https://demoapp.stratzen.ai/summary');
		await expect(summaryHeading).toBeVisible({ timeout: 15000 });
		await expect(riasLink).toBeVisible({ timeout: 15000 });
		await riasLink.click();
		await expect(page).toHaveURL(/\/rias$/);

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

		const findRowByBusinessName = async (businessNameValue) => {
			const rowCount = await exploreRows.count();
			for (let index = 0; index < rowCount; index += 1) {
				const row = exploreRows.nth(index);
				const businessNameCellText = (await row.locator('td').nth(1).textContent())?.trim() || '';
				if (businessNameCellText === businessNameValue) {
					return row;
				}
			}

			return null;
		};

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

		await expect.poll(async () => findRowByBusinessName(targetBusinessName)).not.toBeNull();
		const restoredExploreRow = await findRowByBusinessName(targetBusinessName);
		if (!restoredExploreRow) {
			throw new Error(`Expected to find a RIA row with business name "${targetBusinessName}" after watchlist removal.`);
		}

		await expect(restoredExploreRow).toBeVisible({ timeout: 15000 });
		await expect(restoredExploreRow.locator('td').nth(1)).toContainText(targetBusinessName);

		const restoredActionsCell = restoredExploreRow.locator('td').last();
		const watchlistButtonAgain = restoredActionsCell.locator('button').first();
		await expect(watchlistButtonAgain).toBeVisible({ timeout: 15000 });
		await expect(watchlistButtonAgain).toBeEnabled();
	});
});
