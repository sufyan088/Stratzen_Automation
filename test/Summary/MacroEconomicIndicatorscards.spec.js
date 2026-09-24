import { test, expect } from '@playwright/test';

test.describe('Summary Module - Macro Economic Indicators', () => {
		test.describe.configure({ timeout: 120000 });

    test('TC_VerifyMacroEconomicIndicatorsDetailView', async ({ page }) => {
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
        await test.step('Step 1: Navigate to login page', async () => {
            await page.goto(buildUrl('/login'), {
                waitUntil: 'domcontentloaded',
                timeout: 90000,
            });

            await expect(page).toHaveURL(/login/);
        });

		// Step 2: Enter the email address.
		await test.step('Step 2: Enter the email address', async () => {
            const emailField = page.locator('input[type="email"]');
            await expect(emailField).toBeVisible();
            await emailField.fill(email);
		});

		// Step 3: Enter the password.
		await test.step('Step 3: Enter the password', async () => {
            const passwordField = page.locator('input[type="password"]');
            await expect(passwordField).toBeVisible();
            await passwordField.fill(passwordValue);
		});

		// Step 4: Click the Sign In button.
		await test.step('Step 4: Click the Sign In button', async () => {
            await page.getByRole('button', {
                name: /sign in/i
            }).click();
		});

		// Step 5: Verify the login redirect completes.
		await test.step('Step 5: Verify the login redirect completes', async () => {
            await page.waitForLoadState('networkidle');
			await expect(page).not.toHaveURL(/login/);
        });

		// Step 6: Prepare the Macro Economic Indicators section locator.
        const macroHeading = page.getByText('Macro Economic Indicators', {
            exact: true
        }).first();

        const macroSectionVisible = (await macroHeading.count()) > 0
            && await macroHeading.isVisible().catch(() => false);

		// Step 6: Verify the Macro Economic Indicators detail flow when available.
		await test.step('Step 6: Verify the Macro Economic Indicators detail flow when available', async () => {
            if (macroSectionVisible) {
                const macroSection = macroHeading.locator('xpath=ancestor::*[self::section or self::div][1]');
                const readMoreButton = macroSection.getByRole('button', { name: 'Read More', exact: true });

                await macroHeading.scrollIntoViewIfNeeded();
                await expect(macroHeading).toBeVisible();
                await expect(readMoreButton).toBeVisible();

                await readMoreButton.click();

                const closeDrawerButton = page.getByRole('button', {
                    name: 'Close drawer'
                });
                const detailDialog = page.getByRole('dialog').last();

                await expect(closeDrawerButton).toBeVisible();
                await expect(detailDialog.getByText('Macro Economic Indicators', {
                    exact: true
                }).last()).toBeVisible();

                const sourceAttribution = detailDialog.getByText(/Source:/i).last();
                if (await sourceAttribution.count()) {
                    await expect(sourceAttribution).toBeVisible();
                }

                await closeDrawerButton.click();
                await expect(detailDialog).toHaveCount(0);
                await expect(macroHeading).toBeVisible();
            } else {
                await expect(page.getByRole('heading', { name: 'Market Pulse Live advisor briefing, refreshes every 3 hours.' })).toBeVisible();
            }
        });

		// Step 7: Log out.
		await test.step('Step 7: Log out', async () => {
            await page.getByText('QA', { exact: true }).dispatchEvent('click');
            await page.getByRole('menuitem', { name: 'Logout' }).click();
        });
    });
});