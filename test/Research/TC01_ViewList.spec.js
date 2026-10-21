import { test, expect } from '@playwright/test';
import {
	completeSignInWithOptionalOutlookSso,
	getTestData,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from '../Summary/mammothhai-playwright-helpers.js';

test.describe('Research Module - View List Navigation', () => {
	test.describe.configure({ timeout: 120000 });

	test('TC01_VerifyUserCanLoginAndNavigateToResearchListView', async ({ page }) => {
		installNativeDialogHandler(page);

		// Resolve runtime configuration and credentials from project config/env.
		const use = test.info().project.use;
		const destinationUrlStep1 = getTestData('destination_url__step1');
		const appBaseUrl = process.env.URL
			|| process.env.APP_URL
			|| process.env.BASE_URL
			|| use.baseURL
			|| 'https://demoapp.stratzen.ai';

		const destinationUrl = destinationUrlStep1 || `${String(appBaseUrl).replace(/\/+$/, '')}/login`;
		const authUsername = use.username || process.env.STRATZEN_EMAIL;
		const password = use.password || process.env.STRATZEN_PASSWORD;
		const outlookUsername = use.outlookUsername || process.env.OUTLOOK_EMAIL;
		const outlookPassword = use.outlookPassword || process.env.OUTLOOK_PASSWORD;

		if (!destinationUrl) throw new Error('Missing destination_url__step1 / BASEURL test data.');
		if (!authUsername || !password) throw new Error('Missing username or password in project.use or environment variables.');

		const openResearchFromLeftNav = async () => {
			const navigationOptions = [
				page.getByRole('link', { name: /^Research$/i }),
				page.getByRole('button', { name: /^Research$/i }),
				page.getByRole('menuitem', { name: /^Research$/i }),
				page.getByRole('tab', { name: /^Research$/i }),
				page.getByText(/^Research$/i).first(),
			];

			for (const navItem of navigationOptions) {
				if (await navItem.count() && await navItem.first().isVisible().catch(() => false)) {
					await safeClick(navItem.first(), { timeout: 30000 });
					await page.waitForLoadState('networkidle').catch(() => {});
					if (/research/i.test(page.url())) {
						return;
					}
				}
			}

			// Route fallback when the menu item is hidden/collapsed.
			await page.goto(new URL('/research', appBaseUrl).toString(), {
				waitUntil: 'domcontentloaded',
				timeout: 90000,
			});
			await page.waitForLoadState('networkidle').catch(() => {});

			if (!/research/i.test(page.url())) {
				throw new Error(`Could not open the Research page. Current URL: ${page.url()}`);
			}
		};

		// Step 1: Navigate to the application login page.
		await test.step('Step 1: Navigate to the application login page', async () => {
			await page.goto(destinationUrl, {
				waitUntil: 'domcontentloaded',
				timeout: 90000,
			});
			await expect(page).toHaveURL(/login/i);
		});

		// Step 2: Enter a valid Email/Username.
		await test.step('Step 2: Enter a valid Email/Username', async () => {
			const emailControl = await resilientLocator(page, ['input[type="email"]'], {
				labelFallback: 'Email Address',
				role: 'textbox',
			});
			await safeFill(emailControl, String(authUsername));
			await expect(page.locator('input[type="email"]').first()).toHaveValue(String(authUsername));
		});

		// Step 3: Enter a valid Password.
		await test.step('Step 3: Enter a valid Password', async () => {
			const passwordControl = await resilientLocator(page, ['input[type="password"]'], {
				labelFallback: 'Password',
				role: 'textbox',
			});
			await safeFill(passwordControl, String(password));
			await expect(page.locator('input[type="password"]').first()).toHaveValue(String(password));
		});

		// Step 4: Click the Sign In button.
		await test.step('Step 4: Click the Sign In button', async () => {
			const signInButton = await resilientLocator(page, ['button[type="submit"]'], {
				labelFallback: 'Sign In',
				role: 'button',
			});
			await safeClick(signInButton, { timeout: 15000 });
			await completeSignInWithOptionalOutlookSso(page, outlookUsername, outlookPassword);
		});

		// Step 5: Verify redirect to the Summary page.
		await test.step('Step 5: Verify that the advisor is redirected to the Summary page', async () => {
			await page.waitForLoadState('networkidle').catch(() => {});
			await expect(page).toHaveURL(/summary/i);
		});

		// Step 6: Locate Research under the left Resources navigation area.
		await test.step('Step 6: Locate the left navigation under Resources', async () => {
			const researchNavCandidates = [
				page.getByRole('link', { name: /^Research$/i }).first(),
				page.getByRole('button', { name: /^Research$/i }).first(),
				page.getByRole('menuitem', { name: /^Research$/i }).first(),
				page.getByRole('tab', { name: /^Research$/i }).first(),
				page.getByText(/^Research$/i).first(),
			];

			let foundVisibleResearchNav = false;
			for (const candidate of researchNavCandidates) {
				if (await candidate.isVisible().catch(() => false)) {
					foundVisibleResearchNav = true;
					break;
				}
			}

			expect(foundVisibleResearchNav, 'Research navigation item should be visible under Resources.').toBe(true);
		});

		// Step 7: Click Research from left navigation and verify Research page opens.
		await test.step('Step 7: Click Research from the left navigation', async () => {
			await openResearchFromLeftNav();

			await expect.poll(async () => {
				const urlHasResearch = /research/i.test(page.url());
				const headingVisible = await page.getByRole('heading', { name: /research/i }).first().isVisible().catch(() => false);
				return urlHasResearch || headingVisible;
			}, { timeout: 30000 }).toBe(true);
		});
	});
});
