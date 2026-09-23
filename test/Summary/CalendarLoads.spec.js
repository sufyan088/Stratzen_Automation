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

		await page.goto(buildUrl('/login'));
		await expect(page).toHaveURL(/login/);

		await page.locator('input[type="email"]').fill(email);
		await page.locator('input[type="password"]').fill(passwordValue);
		await page.getByRole('button', { name: /sign in/i }).click();

		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/summary(?:[/?#]|$)/);

		const calendarSection = page.locator('.summary-calendar-wrapper');
		const monthHeader = calendarSection.locator('.calendar-month-year');
		const dayButtons = calendarSection.locator('.calendar-days button.calendar-day');
		const selectedDay = calendarSection.locator('.calendar-day-selected');
		const meetingsPanel = page.locator('.summary-meetings-wrapper');
		const meetingsTitle = meetingsPanel.locator('.meetings-list-title');

		await expect(calendarSection).toBeVisible();
		await expect(monthHeader).toHaveText(currentMonthLabel);
		await expect(dayButtons).toHaveCount(daysInCurrentMonth);
		await expect(selectedDay).toHaveCount(1);

		const selectedDateBeforeClick = (await selectedDay.textContent()).trim();
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

		await targetButton.click();

		await expect(selectedDay).toHaveText(targetDateText);
		await expect(meetingsTitle).toContainText('Meetings');
		await expect(meetingsTitle).not.toContainText("Today's Meetings");
		await expect
			.poll(async () => (await meetingsPanel.innerText()).trim())
			.not.toBe(meetingsTextBeforeClick);
	});
});
