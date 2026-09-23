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

		await page.goto(buildUrl('/login'));
		await expect(page).toHaveURL(/login/);

		await page.locator('input[type="email"]').fill(email);
		await page.locator('input[type="password"]').fill(passwordValue);
		await page.getByRole('button', { name: /sign in/i }).click();

		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/summary(?:[/?#]|$)/);

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
			/(?:Cached\s+[·•]\s+)?Next refresh:/i,
		);

		await expect(marketPulseHeading).toBeVisible();
		await expect(marketPulseDescription).toBeVisible();
		await expect(liveBriefingText).toBeVisible();
		await expect(refreshButton).toBeVisible();
		await expect(expandCollapseControl).toBeVisible();
		await expect(whatToWatchHeading).toBeVisible();
		await expect(cacheTimestamp).toBeVisible();

		await refreshButton.click();

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

		  // logout 

        await page.getByText('QA', { exact: true }).click();
        await page.getByRole('menuitem', { name: 'Logout' }).click();
	});
});
