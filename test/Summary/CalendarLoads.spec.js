import { test, expect } from '@playwright/test';

test.describe('Summary Module - Calendar', () => {
	test.describe.configure({ timeout: 120000 });

	test('TC002_VerifyCalendarLoadsAndDateSelection', async ({ page }) => {
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
		const today = new Date();
		const currentMonthLabel = today.toLocaleString('en-US', {
			month: 'long',
			year: 'numeric',
		});
		const daysInCurrentMonth = new Date(
			today.getFullYear(),
			today.getMonth() + 1,
			0,
		).getDate();

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

		const calendarSection = page.locator('.summary-calendar-wrapper');
		const monthHeader = calendarSection.locator('.calendar-month-year');
		const dayButtons = calendarSection.locator('.calendar-days button.calendar-day');
		const selectedDay = calendarSection.locator('.calendar-day-selected');
		const meetingsPanel = page.locator('.summary-meetings-wrapper');
		const meetingsTitle = meetingsPanel.locator('.meetings-list-title');

		// Step 6: Verify the calendar section loads.
		await test.step('Step 6: Verify the calendar section loads', async () => {
			await expect(calendarSection).toBeVisible();
			await expect(monthHeader).toHaveText(currentMonthLabel);
			await expect(dayButtons).toHaveCount(daysInCurrentMonth);
			await expect(selectedDay).toHaveCount(1);
		});

		const selectedDateBeforeClick = (await selectedDay.textContent()).trim();
		// Step 7: Verify Today's Meetings is shown for the selected date.
		await test.step("Step 7: Verify Today's Meetings is shown for the selected date", async () => {
			await expect(meetingsTitle).toContainText("Today's Meetings");
		});

		let targetButton;
		let targetDateText = '';

		for (let index = 0; index < await dayButtons.count(); index += 1) {
			const button = dayButtons.nth(index);
			const dateText = (await button.textContent()).trim();

			if (dateText !== selectedDateBeforeClick) {
				targetButton = button;
				targetDateText = dateText;
				break;
			}
		}

		const meetingsTextBeforeClick = (await meetingsPanel.innerText()).trim();

		// Step 8: Select another calendar date.
		await test.step('Step 8: Select another calendar date', async () => {
			await targetButton.click();
		});

		// Step 9: Verify the selected date and meetings panel update.
		await test.step('Step 9: Verify the selected date and meetings panel update', async () => {
			await expect(selectedDay).toHaveText(targetDateText);
			await expect(meetingsTitle).toContainText('Meetings');
			await expect(meetingsTitle).not.toContainText("Today's Meetings");
			await expect
				.poll(async () => (await meetingsPanel.innerText()).trim())
				.not.toBe(meetingsTextBeforeClick);
		});
	});
});
