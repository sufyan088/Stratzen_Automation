import { test, expect } from '@playwright/test';
import {
	completeSignInWithOptionalOutlookSso,
	getTestData,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from '../Summary/mammothhai-playwright-helpers.js';

test.describe('401K Module - EIN And Plan Name Search', () => {
	test.describe.configure({ timeout: 90000 });

	test('TC03_VerifyEinAndPlanNameColumnSearchFieldsAreFunctional', async ({ page }) => {
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

		const expectedEin = '47-4184819';
		const planNameFragment = '10 bond';
		const expectedPlanName = '10 BOND RETIREMENT PLAN';

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

		// Helper for polling until a matching table value is actually visible to the user.
		const hasVisibleMatch = async (locator) => {
			const matchCount = await locator.count();
			for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
				if (await locator.nth(matchIndex).isVisible().catch(() => false)) {
					return true;
				}
			}

			return false;
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

		const dataTable = page.locator('table').first();
		const einFilter = page.getByRole('textbox', { name: 'e.g. 12-3456789' });
		const planNameFilter = page.getByRole('textbox', { name: 'Filter by Plan Name' });
		const paginationSummary = page.getByText(/\d+-\d+ of [\d,]+/).first();
		const exactEinMatch = dataTable.getByText(expectedEin, { exact: true });
		const planNameMatch = dataTable.getByText(expectedPlanName, { exact: true });

		// Capture the unfiltered footer text so we can verify the broader result set returns after clearing filters.
		await expect(dataTable).toBeVisible();
		await expect(paginationSummary).toBeVisible();
		await expect.poll(
			async () => ((await paginationSummary.textContent()) || '').trim(),
			{ timeout: 15000 },
		).not.toBe('0-0 of 0');
		const baselineSummary = ((await paginationSummary.textContent()) || '').trim();
		if (!baselineSummary) {
			throw new Error('Expected a pagination summary for the default 401K grid.');
		}

		await test.step('Step 6: Locate the EIN filter field', async () => {
			// Confirm the EIN filter is available before entering the known test value.
			await expect(einFilter).toBeVisible();
			await expect(einFilter).toBeEnabled();
		});

		await test.step('Step 7: Enter a known EIN and verify the returned EIN', async () => {
			// Apply the EIN search and wait for the matching plan record to appear in the grid.
			await einFilter.fill(expectedEin);
			await einFilter.press('Enter');

			await expect.poll(
				async () => (await hasVisibleMatch(exactEinMatch)) ? 1 : 0,
				{ timeout: 15000 },
			).toBe(1);
		});

		await test.step('Step 8: Clear the EIN filter', async () => {
			// Remove the EIN restriction and verify the default broader grid result set comes back.
			await einFilter.fill('');
			await einFilter.press('Enter');
			await expect(einFilter).toHaveValue('');

			await expect.poll(
				async () => ((await paginationSummary.textContent()) || '').trim(),
				{ timeout: 15000 },
			).toBe(baselineSummary);
		});

		await test.step('Step 9: Enter a plan-name fragment and verify the matching plan', async () => {
			// Apply the plan-name search and verify the expected matching plan is displayed.
			await expect(planNameFilter).toBeVisible();
			await expect(planNameFilter).toBeEnabled();
			await planNameFilter.fill(planNameFragment);
			await planNameFilter.press('Enter');

			await expect.poll(
				async () => (await hasVisibleMatch(planNameMatch)) ? 1 : 0,
				{ timeout: 15000 },
			).toBe(1);
		});

		await test.step('Step 10: Clear the Plan Name filter', async () => {
			// Clear the plan-name restriction and confirm the broader default result set is restored.
			await planNameFilter.fill('');
			await planNameFilter.press('Enter');
			await expect(planNameFilter).toHaveValue('');

			await expect.poll(
				async () => ((await paginationSummary.textContent()) || '').trim(),
				{ timeout: 15000 },
			).toBe(baselineSummary);
		});

		await test.step('Step 11: Logout from the application', async () => {
			await safeClick(page.getByText('QA', { exact: true }), { timeout: 30000 });
			await safeClick(page.getByRole('menuitem', { name: 'Logout' }), { timeout: 30000 });
			await expect(page).toHaveURL(/login/);
		});
	});
});
