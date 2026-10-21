import { test, expect } from '@playwright/test';
import {
	completeSignInWithOptionalOutlookSso,
	getTestData,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from './mammothhai-playwright-helpers.js';

test.describe('Summary Module - Market Pulse', () => {
	test('TC_VerifyMarketPulseDisplayAndRefresh', async ({ page }) => {
		test.setTimeout(90000);
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

		// Step 5: Verify the login redirect completes.
		await test.step('Step 5: Verify the login redirect completes', async () => {
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/\/summary(?:[/?#]|$)/);
		});

		// Step 7: Scroll to the Market Pulse section.
		const marketPulseSection = page
			.getByRole('button', {
				name: /^Market Pulse Live advisor briefing, refreshes every 3 hours\.$/i,
			})
			.first();
		await marketPulseSection.scrollIntoViewIfNeeded();

		const marketPulseHeading = page.getByRole('heading', { name: 'Market Pulse' });
		const marketPulseDescription = page.getByText(
			'Live advisor briefing, refreshes every 3 hours.',
			{ exact: true },
		);
		const refreshButton = page.getByRole('button', { name: 'Refresh', exact: true });
		const expandCollapseControl = page.getByRole('button', {
			name: /show full market pulse|show less market pulse/i,
		});
		const whatToWatchHeading = page.getByRole('heading', { name: 'What to Watch' });
		const marketPulseRegion = page
			.getByRole('region')
			.filter({ has: refreshButton });
		const liveBriefingText = marketPulseRegion.locator('p').filter({
			hasText: /S&P 500 at/i,
			}).first();
		const cacheTimestamp = marketPulseRegion.getByText(
			/(?:Cached\s+[Â·â€¢]\s+)?Next refresh:/i,
		);

		// Step 8: Verify the Market Pulse content is visible.
		await test.step('Step 8: Verify the Market Pulse content is visible', async () => {
			await expect(marketPulseHeading).toBeVisible();
			await expect(marketPulseDescription).toBeVisible();
			await expect(liveBriefingText).toBeVisible();
			await expect(refreshButton).toBeVisible();
			await expect(expandCollapseControl).toBeVisible();
			await expect(whatToWatchHeading).toBeVisible();
			await expect(cacheTimestamp).toBeVisible();
		});

		// Step 9: Click the Refresh button.
		await test.step('Step 9: Click the Refresh button', async () => {
			await refreshButton.click();
		});

		// Step 10: Verify the Market Pulse refresh cycle completes.
		await test.step('Step 10: Verify the Market Pulse refresh cycle completes', async () => {
			await expect(refreshButton).toBeDisabled();
			await expect(refreshButton.getByRole('progressbar')).toBeVisible();
			await expect(liveBriefingText).toBeVisible();
			await expect(whatToWatchHeading).toBeVisible();
			await expect(cacheTimestamp).toBeVisible();
			await expect(refreshButton.getByRole('progressbar')).toHaveCount(0, {
				timeout: 60000,
			});

			await expect(liveBriefingText).toBeVisible();
			await expect(whatToWatchHeading).toBeVisible();
			await expect(cacheTimestamp).toBeVisible();
			await expect(marketPulseRegion).not.toContainText(/loading|refreshing/i);
		});

		// Step 11: Logout from the application.
		await test.step('Step 11: Logout from the application', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
		});
	});
});
