import { test, expect } from '@playwright/test';
import {
	completeSignInWithOptionalOutlookSso,
	getTestData,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from '../Summary/mammothhai-playwright-helpers.js';

test.describe('401K Module - Watchlist Add / Remove', () => {
	test.describe.configure({ timeout: 120000 });

	test('TC08_Verify401KPlanCanBeAddedAndRemovedFromWatchlist', async ({ page }) => {
		installNativeDialogHandler(page);
		// Resolve runtime configuration and test data for the advisor session.
		const use = test.info().project.use;
		const destinationUrlStep1 = getTestData('destination_url__step1');
		const appBaseUrl = process.env.URL
			|| process.env.APP_URL
			|| process.env.BASE_URL
			|| use.baseURL;

		if (!appBaseUrl) {
			throw new Error('Set URL, APP_URL, or BASE_URL before running this test.');
		}

		const destinationUrl = destinationUrlStep1 || `${String(appBaseUrl).replace(/\/+$/, '')}/login`;
		const email = use.username || process.env.STRATZEN_EMAIL;
		const passwordValue = use.password || process.env.STRATZEN_PASSWORD;
		const outlookUsername = use.outlookUsername || process.env.OUTLOOK_EMAIL;
		const outlookPassword = use.outlookPassword || process.env.OUTLOOK_PASSWORD;

		if (!destinationUrl) throw new Error('Missing destination_url__step1 / BASEURL test data.');
		if (!email || !passwordValue) throw new Error('Missing username or password in project.use or environment variables.');

		// Reuse the first matching 401K navigation entry so the test survives minor nav label changes.
		const openExplore401K = async () => {
			const is401KViewOpen = async () => {
				if (/401k|401-k/i.test(page.url())) return true;

				const viewMarkers = [
					page.getByRole('heading', { name: /explore\s*401k/i }).first(),
					page.getByRole('button', { name: /saved filters/i }).first(),
					page.getByRole('textbox', { name: /e\.g\.\s*12-3456789/i }).first(),
					page.locator('table').first(),
				];

				for (const marker of viewMarkers) {
					if (await marker.isVisible().catch(() => false)) {
						return true;
					}
				}

				return false;
			};

			const navigationOptions = [
				page.getByRole('link', { name: '401K', exact: true }),
				page.getByRole('link', { name: '401Ks', exact: true }),
				page.getByRole('link', { name: 'Explore 401K', exact: true }),
				page.getByRole('button', { name: /401k|401ks|explore 401k/i }),
				page.getByRole('menuitem', { name: /401k|401ks|explore 401k/i }),
				page.getByRole('tab', { name: /401k|401ks|explore 401k/i }),
				page.getByText(/401k|401ks|explore 401k/i).first(),
			];

			for (const navigationLink of navigationOptions) {
				if (await navigationLink.count() && await navigationLink.first().isVisible().catch(() => false)) {
					await safeClick(navigationLink.first(), { timeout: 30000 });
					await page.waitForLoadState('networkidle');
					if (await is401KViewOpen()) {
						return;
					}
					continue;
				}
			}

			// Fallback to known route patterns if left-nav labels are changed or hidden.
			const routeFallbacks = ['/research', '/research/401k', '/research/explore-401k', '/401k', '/401-k', '/explore-401k'];
			for (const route of routeFallbacks) {
				await page.goto(new URL(route, appBaseUrl).toString(), {
					waitUntil: 'domcontentloaded',
					timeout: 90000,
				});
				await page.waitForLoadState('networkidle').catch(() => {});

				const researchEntry = page.getByRole('link', { name: /401k|401ks|explore 401k/i }).first();
				if (await researchEntry.isVisible().catch(() => false)) {
					await safeClick(researchEntry, { timeout: 30000 });
					await page.waitForLoadState('networkidle').catch(() => {});
				}

				if (await is401KViewOpen()) {
					return;
				}
			}

			throw new Error(`Could not open the Explore 401K page. Current URL: ${page.url()}`);
		};

		await test.step('Step 1: Navigate to the login page', async () => {
			await page.goto(destinationUrl, {
				waitUntil: 'domcontentloaded',
				timeout: 90000,
			});
			await expect(page).toHaveURL(/login/);
		});

		await test.step('Step 2: Enter the advisor email address', async () => {
			const emailField = await resilientLocator(page, ['input[type="email"]'], { labelFallback: 'Email Address', role: 'textbox' });
			await safeFill(emailField, String(email));
			await expect(page.locator('input[type="email"]').first()).toHaveValue(String(email));
		});

		await test.step('Step 3: Enter the advisor password', async () => {
			const passwordField = await resilientLocator(page, ['input[type="password"]'], { labelFallback: 'Password', role: 'textbox' });
			await safeFill(passwordField, String(passwordValue));
			await expect(page.locator('input[type="password"]').first()).toHaveValue(String(passwordValue));
		});

		await test.step('Step 4: Sign in to the application', async () => {
			const signInButton = await resilientLocator(page, ['button[type="submit"]'], { labelFallback: 'Sign In', role: 'button' });
			await safeClick(signInButton, { timeout: 15000 });
			await completeSignInWithOptionalOutlookSso(page, outlookUsername, outlookPassword);
			await expect(page).toHaveURL(/summary/);
		});

		await test.step('Step 5: Open Explore 401K', async () => {
			await openExplore401K();
			await expect.poll(async () => {
				const headingVisible = await page
					.getByRole('heading', { name: /Explore 401k/i })
					.first()
					.isVisible()
					.catch(() => false);
				const tableVisible = await page.locator('table').first().isVisible().catch(() => false);
				return headingVisible || tableVisible;
			}, { timeout: 30000 }).toBe(true);
		});

		const exploreTable = page.locator('table').first();
		const exploreRows = exploreTable.locator('tbody tr');
		const planNameFilterField = exploreTable.getByRole('columnheader').nth(1).getByRole('textbox');
		const explore401KLink = page.getByRole('link', { name: '401K', exact: true });
		const watchlist401KLink = page.getByRole('link', { name: '401K Watchlist', exact: true });

		const normalizeText = (value) => value.replace(/\s+/g, ' ').trim();
		const normalizeAmount = (value) => value.replace(/[$,\s]/g, '').trim();
		const normalizeLocation = (city, state) => `${normalizeText(city)}, ${normalizeText(state)}`;
		const stateToCode = {
			alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
			connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
			illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
			maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
			mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
			'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
			'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
			pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
			tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
			'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
		};
		const getStateCode = (stateValue) => {
			const normalized = normalizeText(stateValue).toLowerCase();
			if (normalized.length === 2) {
				return normalized.toUpperCase();
			}

			return stateToCode[normalized] || normalized.toUpperCase();
		};

		const getFirstRowWithAddWatchlistAction = async () => {
			const rowCount = await exploreRows.count();
			for (let index = 0; index < rowCount; index += 1) {
				const row = exploreRows.nth(index);
				const ein = normalizeText((await row.locator('td').nth(0).textContent()) || '');
				const planName = normalizeText((await row.locator('td').nth(1).textContent()) || '');
				const totalAssets = normalizeText((await row.locator('td').nth(3).textContent()) || '');
				const city = normalizeText((await row.locator('td').nth(5).textContent()) || '');
				const state = normalizeText((await row.locator('td').nth(6).textContent()) || '');
				const actionsCell = row.locator('td').last();
				const actionMarkup = ((await actionsCell.innerHTML()) || '').toLowerCase();

				const hasAddToWatchlistState =
					actionMarkup.includes('add to watchlist')
					|| (await actionsCell.locator('[aria-label*="add to watchlist" i], [title*="add to watchlist" i]').count()) > 0;
				const isAlreadyInWatchlist =
					actionMarkup.includes('remove from watchlist')
					|| (await actionsCell.locator('[aria-label*="remove from watchlist" i], [title*="remove from watchlist" i]').count()) > 0;

				if (!ein || !planName || !totalAssets || !city || !state) {
					continue;
				}
				if (isAlreadyInWatchlist || !hasAddToWatchlistState) {
					continue;
				}

				const addButtonByName = actionsCell.getByRole('button', { name: /add to watchlist/i });
				const visibleActionButtons = actionsCell.locator('button:visible');
				const addWatchlistButton = (await addButtonByName.count()) > 0 ? addButtonByName.first() : visibleActionButtons.first();

				return {
					row,
					ein,
					planName,
					totalAssets,
					city,
					state,
					actionsCell,
					addWatchlistButton,
				};
			}

			return null;
		};

		await test.step('Step 6: Identify non-watchlisted plan and record row values', async () => {
			await expect(exploreTable).toBeVisible();
			await expect(exploreRows.first()).toBeVisible();
		});

		let targetPlan;

		await test.step('Step 7: Add the selected plan to watchlist', async () => {
			await expect
				.poll(async () => {
					targetPlan = await getFirstRowWithAddWatchlistAction();
					return targetPlan !== null;
				}, { timeout: 30000 })
				.toBe(true);

			if (!targetPlan) {
				throw new Error('Expected at least one 401K row with an Add to watchlist action.');
			}

			await expect(targetPlan.row).toBeVisible();
			await expect(targetPlan.actionsCell).toBeVisible();
			await expect(targetPlan.addWatchlistButton).toBeVisible();
			await targetPlan.addWatchlistButton.click();

			await expect
				.poll(async () => {
					const actionMarkup = ((await targetPlan.actionsCell.innerHTML()) || '').toLowerCase();
					return actionMarkup.includes('remove from watchlist')
						|| (await targetPlan.actionsCell.locator('[aria-label*="remove from watchlist" i], [title*="remove from watchlist" i]').count()) > 0;
				}, { timeout: 15000 })
				.toBe(true);
		});

		await test.step('Step 8: Navigate to 401K Watchlist and verify the added plan', async () => {
			await expect(watchlist401KLink).toBeVisible({ timeout: 15000 });
			await safeClick(watchlist401KLink, { timeout: 30000 });
			await expect(page).toHaveURL(/\/401k-watchlist$/);

			const watchlistHeading = page.getByRole('heading', { name: /401k watchlist/i }).first();
			await expect(watchlistHeading).toBeVisible({ timeout: 15000 });

			const watchlistTargetCard = page
				.locator('.kanban-card')
				.filter({ has: page.getByText(targetPlan.planName, { exact: false }) })
				.first();

			await expect(watchlistTargetCard).toBeVisible({ timeout: 20000 });

			const cardText = normalizeText((await watchlistTargetCard.innerText()) || '');
			expect(cardText.toLowerCase()).toContain(targetPlan.planName.toLowerCase());
			expect(cardText.toLowerCase()).toContain(normalizeAmount(targetPlan.totalAssets).toLowerCase());

			const locationCandidates = [
				normalizeLocation(targetPlan.city, targetPlan.state),
				`${targetPlan.city} ${targetPlan.state}`,
				normalizeLocation(targetPlan.city, getStateCode(targetPlan.state)),
				`${targetPlan.city} ${getStateCode(targetPlan.state)}`,
			];
			expect(locationCandidates.some((candidate) => cardText.toLowerCase().includes(candidate.toLowerCase()))).toBe(true);
		});

		await test.step('Step 9: Return to Explore 401K and verify watchlisted state', async () => {
			await expect(explore401KLink).toBeVisible({ timeout: 15000 });
			await safeClick(explore401KLink, { timeout: 30000 });
			await expect(page).toHaveURL(/\/401k$/);

			await expect(exploreTable).toBeVisible({ timeout: 15000 });
			await expect(planNameFilterField).toBeVisible({ timeout: 15000 });
			await planNameFilterField.fill('');
			await planNameFilterField.fill(targetPlan.planName);
			await planNameFilterField.press('Enter');
			await expect(planNameFilterField).toHaveValue(targetPlan.planName);

			const restoredExploreRow = exploreRows
				.filter({ has: page.getByText(targetPlan.ein, { exact: true }) })
				.filter({ has: page.getByText(targetPlan.planName, { exact: true }) })
				.first();
			await expect(restoredExploreRow).toBeVisible({ timeout: 15000 });

			const restoredActionsCell = restoredExploreRow.locator('td').last();
			await expect
				.poll(async () => {
					const actionMarkup = ((await restoredActionsCell.innerHTML()) || '').toLowerCase();
					return actionMarkup.includes('remove from watchlist')
						|| (await restoredActionsCell.locator('[aria-label*="remove from watchlist" i], [title*="remove from watchlist" i]').count()) > 0;
				}, { timeout: 15000 })
				.toBe(true);

			const removeButtonByName = restoredActionsCell.getByRole('button', { name: /remove from watchlist/i });
			const visibleButtons = restoredActionsCell.locator('button:visible');
			const removeWatchlistButton = (await removeButtonByName.count()) > 0 ? removeButtonByName.first() : visibleButtons.first();

			await expect(removeWatchlistButton).toBeVisible();
			await removeWatchlistButton.click();

			await expect
				.poll(async () => {
					const actionMarkup = ((await restoredActionsCell.innerHTML()) || '').toLowerCase();
					return actionMarkup.includes('add to watchlist')
						|| (await restoredActionsCell.locator('[aria-label*="add to watchlist" i], [title*="add to watchlist" i]').count()) > 0;
				}, { timeout: 15000 })
				.toBe(true);
		});

		await test.step('Step 10: Logout from the application', async () => {
			await safeClick(page.getByText('QA', { exact: true }), { timeout: 30000 });
			await safeClick(page.getByRole('menuitem', { name: 'Logout' }), { timeout: 30000 });
			await expect(page).toHaveURL(/login/);
		});
	});
});
