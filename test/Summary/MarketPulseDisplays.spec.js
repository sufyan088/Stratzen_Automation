const { test, expect } = require('@playwright/test');

test.describe('Summary Module - Market Pulse', () => {
	test('TC_VerifyMarketPulseDisplayAndRefresh', async ({ page }) => {
		test.setTimeout(90000);

		const email = 'SZ_AutoQA@stratzen.ai';
		const passwordValue = 'StratzenAutomation123';

		await page.goto('https://demoapp.stratzen.ai/login');
		await expect(page).toHaveURL(/login/);

		await page.locator('input[type="email"]').fill(email);
		await page.locator('input[type="password"]').fill(passwordValue);
		await page.getByRole('button', { name: /sign in/i }).click();

		await page.waitForURL('https://demoapp.stratzen.ai/summary');

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

		await page.getByText('QA', { exact: true }).click();
		await page.getByRole('menuitem', { name: 'Logout' }).click();
	});
});
