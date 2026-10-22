import { test, expect } from '@playwright/test';
import {
	completeSignInWithOptionalOutlookSso,
	getTestData,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from '../Summary/mammothhai-playwright-helpers.js';

test.describe('Research Module - Access Research Page', () => {
	test.describe.configure({ timeout: 120000 });

	test('TC02_VerifyAdvisorCanAccessResearchModuleSuccessfully', async ({ page }) => {
		installNativeDialogHandler(page);

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

		// Step 1: Navigate to the login page.
		await test.step('Step 1: Navigate to the login page', async () => {
			await page.goto(destinationUrl, {
				waitUntil: 'domcontentloaded',
				timeout: 90000,
			});
			await expect(page).toHaveURL(/login/);
		});

		// Step 2: Enter valid username and password, then sign in.
		await test.step('Step 2: Sign in with valid advisor credentials', async () => {
			const emailControl = await resilientLocator(page, ['input[type="email"]'], {
				labelFallback: 'Email Address',
				role: 'textbox',
			});
			await safeFill(emailControl, String(authUsername));

			const passwordControl = await resilientLocator(page, ['input[type="password"]'], {
				labelFallback: 'Password',
				role: 'textbox',
			});
			await safeFill(passwordControl, String(password));

			const signInButton = await resilientLocator(page, ['button[type="submit"]', '#idSIButton9'], {
				labelFallback: 'Sign In',
				role: 'button',
			});
			await safeClick(signInButton, { timeout: 20000 });
			await completeSignInWithOptionalOutlookSso(page, outlookUsername, outlookPassword);
		});

		// Step 3: Login into Outlook Account
		await test.step('Step 3: Login into Outlook Account', async () => {
			await page.waitForLoadState('networkidle').catch(() => {});
			expect(/\/(summary|rias|research|preferences)(\/|$)/i.test(page.url())).toBe(true);
		});

		// Step 4: Click the Research module from the left sidebar and verify it opens.
		await test.step('Step 4: Open Research module from the left sidebar', async () => {
			const researchNav = page.getByRole('link', { name: /^Research$/i }).first();
			await expect(researchNav).toBeVisible();
			await safeClick(researchNav, { timeout: 20000 });
			await page.waitForLoadState('networkidle').catch(() => {});

			await expect(page).toHaveURL(/\/research/);
		});

		// Step 5: Verify the Research page URL and core tabs/icons are displayed.
		await test.step('Step 5: Verify Research page, tabs, and Ad-Bot icon are displayed', async () => {
			await expect(page).toHaveURL(/\/research\?/i);
			await expect.poll(() => {
				const url = new URL(page.url());
				const watchlistAsset = url.searchParams.get('watchlist_asset');
				const screenerAsset = url.searchParams.get('screener_asset');
				const tab = url.searchParams.get('tab');
				const validTab = tab === 'watchlist' || tab === 'screener';
				return watchlistAsset === 'stock' && screenerAsset === 'all' && validTab;
			}, { timeout: 15000 }).toBe(true);

			const watchlistTab = page.getByRole('tab', { name: /Watchlist/i }).first();
			const universeBuilderTab = page.getByRole('tab', { name: /Universe Builder/i }).first();
			const universeScreenerTab = page.getByRole('tab', { name: /Universe Screener/i }).first();
			const adBotCandidates = [
				page.getByRole('button', { name: /open chat help|open chat|ad[- ]?bot|chat/i }).first(),
				page.getByText(/ad[- ]?bot/i).first(),
				page.locator('[aria-label*="ad-bot" i], [aria-label*="ad bot" i], [aria-label*="chat" i]').first(),
				page.locator('[title*="ad-bot" i], [title*="ad bot" i], [title*="chat" i]').first(),
				page.locator('[data-testid*="adbot" i], [data-testid*="chat" i]').first(),
			];

			await expect(watchlistTab).toBeVisible();
			await expect(universeBuilderTab).toBeVisible();
			await expect(universeScreenerTab).toBeVisible();
			await expect.poll(async () => {
				for (const candidate of adBotCandidates) {
					if (await candidate.isVisible().catch(() => false)) {
						return true;
					}
				}
				return false;
			}, { timeout: 20000 }).toBe(true);
		});

		// Step 6: Logout from the application.
		await test.step('Step 6: Logout from the application', async () => {
			const profileTrigger = await resilientLocator(page, [
				'text=QA',
				'button[aria-label*="profile" i]',
				'button[aria-label*="account" i]',
				'[data-testid*="profile" i]',
			], {
				labelFallback: 'QA',
				role: 'button',
			});

			await safeClick(profileTrigger, { timeout: 20000 });

			const logoutItem = await resilientLocator(page, [
				'role=menuitem[name="Logout"]',
				'text=Logout',
			], {
				labelFallback: 'Logout',
				role: 'menuitem',
			});

			await safeClick(logoutItem, { timeout: 20000 });
			await expect(page).toHaveURL(/login/i);
		});
	});
});
