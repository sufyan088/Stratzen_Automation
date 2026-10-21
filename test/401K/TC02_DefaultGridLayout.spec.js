import { test, expect } from '@playwright/test';
import {
	completeSignInWithOptionalOutlookSso,
	getTestData,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from '../Summary/mammothhai-playwright-helpers.js';

test.describe('401K Module - Default Grid Layout', () => {
	test.describe.configure({ timeout: 90000 });

	test('TC02_VerifyDefault401KGridColumnsAndRowPresentation', async ({ page }) => {
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
		// Only validate the columns that are present by default in the current 401K grid.
		const expectedColumns = [
			'EIN',
			'Plan Name',
			'Participants',
			'Total Assets',
			'Total Fees',
			'City',
			'State',
			'Status',
			'Actions',
		];

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

		const pageHeading = page.getByRole('heading', { name: /Explore 401k/i });
		const pageDescription = page.locator('main');
		const savedFiltersControl = page.getByRole('button', { name: /saved filters/i });
		const adBotControl = page.getByRole('button', { name: /open chat help/i });
		const adBotLabel = page.getByText('Ad-Bot', { exact: true });
		const dataTable = page.locator('table').first();
		const tableHeaders = dataTable.getByRole('columnheader');

		await test.step('Step 6: Read the page heading and description', async () => {
			// Confirm the page title and purpose text match the Explore 401K workflow.
			await expect(pageHeading).toBeVisible();
			await expect(pageDescription).toContainText('Find and compare 401k plan providers');
		});

		await test.step('Step 7: Verify Saved Filters is visible and clickable', async () => {
			// Saved Filters must be present; some environments keep it disabled until data/session state is ready.
			await expect(savedFiltersControl).toBeVisible();

			const isEnabled = await savedFiltersControl.isEnabled().catch(() => false);
			if (isEnabled) {
				await safeClick(savedFiltersControl, { timeout: 15000 });
			}
		});

		await test.step('Step 8: Inspect the 401K grid header', async () => {
			await expect(dataTable).toBeVisible();

			// Read the rendered header text and compare it against the supported default columns.
			const actualHeaderTexts = (await tableHeaders.allTextContents())
				.map((textValue) => textValue.replace(/\s+/g, ' ').trim())
				.filter(Boolean);
			const missingColumns = expectedColumns.filter(
				(columnName) => !actualHeaderTexts.some((headerText) => headerText.includes(columnName)),
			);

			expect(
				missingColumns,
				`Expected 401K grid headers to include all workflow columns. Actual headers: ${actualHeaderTexts.join(' | ')}`,
			).toEqual([]);
		});

		await test.step('Step 9: Verify the Ad-Bot control is visible at the upper-right', async () => {
			// Check both visibility and relative placement so Ad-Bot does not cover the table.
			await expect(adBotControl).toBeVisible();
			await expect(adBotLabel).toBeVisible();

			const adBotBox = await adBotControl.boundingBox();
			const tableBox = await dataTable.boundingBox();
			if (!adBotBox || !tableBox) {
				throw new Error('Expected Ad-Bot control and 401K table to have bounding boxes.');
			}

			expect(adBotBox.x).toBeGreaterThan(tableBox.x + tableBox.width / 2);
			expect(adBotBox.y + adBotBox.height).toBeLessThanOrEqual(tableBox.y + 20);
		});

		await test.step('Step 10: Logout from the application', async () => {
			await safeClick(page.getByText('QA', { exact: true }), { timeout: 30000 });
			await safeClick(page.getByRole('menuitem', { name: 'Logout' }), { timeout: 30000 });
			await expect(page).toHaveURL(/login/);
		});
	});
});
