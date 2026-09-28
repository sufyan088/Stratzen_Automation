import { test, expect } from '@playwright/test';

test.describe('Summary Module - Calendar', () => {
	test.describe.configure({ timeout: 120000 });

	test('TC002_VerifyCalendarLoadsAndDateSelection', async ({ page }) => {
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
		await page.goto(buildUrl('/login'));
		// Step 2: Verify the login page loads.
		await expect(page).toHaveURL(/login/);

		// Step 3: Enter the email address.
		await page.locator('input[type="email"]').fill(email);
		// Step 4: Enter the password.
		await page.locator('input[type="password"]').fill(passwordValue);
		// Step 5: Click the Sign In button.
		await page.getByRole('button', { name: /sign in/i }).click();

		// Step 6: Verify the login redirect completes.
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/summary(?:[/?#]|$)/);

		const calendarSection = page.locator('.summary-calendar-wrapper');
		const monthHeader = calendarSection.locator('.calendar-month-year');
		const dayButtons = calendarSection.locator('.calendar-days button.calendar-day');
		const selectedDay = calendarSection.locator('.calendar-day-selected');
		const meetingsPanel = page.locator('.summary-meetings-wrapper');
		const meetingsTitle = meetingsPanel.locator('.meetings-list-title');

		// Step 7: Verify the calendar section loads.
		await expect(calendarSection).toBeVisible();
		// Step 8: Verify the current month and date grid are displayed.
		await expect(monthHeader).toHaveText(currentMonthLabel);
		await expect(dayButtons).toHaveCount(daysInCurrentMonth);
		await expect(selectedDay).toHaveCount(1);

		const selectedDateBeforeClick = (await selectedDay.textContent()).trim();
		// Step 9: Verify Today's Meetings is shown for the selected date.
		await expect(meetingsTitle).toContainText("Today's Meetings");

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

		// Step 10: Select another calendar date.
		await targetButton.click();

		// Step 11: Verify the selected date and meetings panel update.
		await expect(selectedDay).toHaveText(targetDateText);
		await expect(meetingsTitle).toContainText('Meetings');
		await expect(meetingsTitle).not.toContainText("Today's Meetings");
		await expect
			.poll(async () => (await meetingsPanel.innerText()).trim())
			.not.toBe(meetingsTextBeforeClick);
	});
});
