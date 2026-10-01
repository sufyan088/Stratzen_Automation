import { test, expect } from '@playwright/test';

test.describe('Summary Module - Market Pulse', () => {
	test('TC_VerifyMarketPulseDisplayAndRefresh', async ({ page }) => {
		test.setTimeout(90000);

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
			await page.locator('input[type="email"]').first().fill(email);
		});

		// Step 3: Enter the password.
		await test.step('Step 3: Enter the password', async () => {
			await page.locator('input[type="password"]').first().fill(passwordValue);
		});

		// Step 4: Click the Sign In button.
		await test.step('Step 4: Click the Sign In button', async () => {
			await page.getByRole('button', { name: /sign in/i }).click();
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
