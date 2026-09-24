import { test, expect } from '@playwright/test';

test.describe('Summary Module - Market Pulse', () => {
	test.describe.configure({ timeout: 120000 });

	test('TC_VerifyMarketPulseDisplayAndRefresh', async ({ page }) => {
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
		await test.step('Step 1 - Action: Navigate to login page', async () => {
			await page.goto(buildUrl('/login'), {
				waitUntil: 'domcontentloaded',
				timeout: 90000,
			});
			await expect(page).toHaveURL(/login/);
		});

		// Step 2: Enter the email address.
		await test.step('Step 2 - Action: Enter the email address', async () => {
			const emailField = page.locator('input[type="email"]');
			await expect(emailField).toBeVisible();
			await emailField.fill(email);
		});

		// Step 3: Enter the password.
		await test.step('Step 3 - Action: Enter the password', async () => {
			const passwordField = page.locator('input[type="password"]');
			await expect(passwordField).toBeVisible();
			await passwordField.fill(passwordValue);
		});

		// Step 4: Click the Sign In button.
		await test.step('Step 4 - Action: Click the Sign In button', async () => {
			await page.getByRole('button', { name: /sign in/i }).click();
		});

		// Step 5: Verify the login redirect completes.
		await test.step('Step 5 - Action: Verify the login redirect completes', async () => {
			await page.waitForLoadState('networkidle');
			await expect(page).not.toHaveURL(/login/);
		});

		const marketPulseSection = page
			.getByRole('button', {
				name: /^Market Pulse Live advisor briefing, refreshes every 3 hours\.$/i,
			})
			.first();

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
		const liveBriefingText = marketPulseRegion.locator('p').first();
		const cacheTimestamp = marketPulseRegion.getByText(
			/(?:Cached\s+[·•]\s+)?Next refresh:/i,
		);

		// Step 6: Scroll to the Market Pulse section.
		await test.step('Step 6 - Action: Scroll to the Market Pulse section', async () => {
			await marketPulseSection.scrollIntoViewIfNeeded();
			await expect(marketPulseSection).toBeVisible();
		});

		// Step 7: Verify Market Pulse content is visible.
		await test.step('Step 7 - Action: Verify Market Pulse content is visible', async () => {
			await expect(marketPulseSection).toBeVisible();
			await expect(marketPulseHeading).toBeVisible();
			await expect(marketPulseDescription).toBeVisible();
			await expect(marketPulseRegion).toBeVisible();
			await expect
				.poll(async () => (await liveBriefingText.textContent())?.trim() || '', {
					timeout: 15000,
				})
				.toMatch(/\S+/);
			await expect(liveBriefingText).toBeVisible();
			await expect(refreshButton).toBeVisible();
			await expect(expandCollapseControl).toBeVisible();
			await expect(whatToWatchHeading).toBeVisible();
			await expect(cacheTimestamp).toBeVisible();
		});

		// Step 8: Click Refresh for Market Pulse content.
		await test.step('Step 8 - Action: Click Refresh for Market Pulse content', async () => {
			await refreshButton.click();

			await expect(refreshButton).toBeDisabled();
			await expect(refreshButton.getByRole('progressbar')).toBeVisible();
			await expect(liveBriefingText).toBeVisible();
			await expect(whatToWatchHeading).toBeVisible();
			await expect(cacheTimestamp).toBeVisible();
		});

		// Step 9: Wait for the Market Pulse refresh to complete.
		await test.step('Step 9 - Action: Wait for the Market Pulse refresh to complete', async () => {
			await expect(refreshButton.getByRole('progressbar')).toHaveCount(0, {
				timeout: 60000,
			});
			await expect(refreshButton).toBeEnabled();
		});

		// Step 10: Verify Market Pulse content remains available after refresh.
		await test.step('Step 10 - Action: Verify Market Pulse content remains available after refresh', async () => {
			await expect(liveBriefingText).toBeVisible();
			await expect(whatToWatchHeading).toBeVisible();
			await expect(cacheTimestamp).toBeVisible();
			await expect(refreshButton).toBeEnabled();
		});

		// Step 11: Log out.
		await test.step('Step 11 - Action: Log out', async () => {
			await page.getByText('QA', { exact: true }).click();
			await page.getByRole('menuitem', { name: 'Logout' }).click();
		});
	});
});
