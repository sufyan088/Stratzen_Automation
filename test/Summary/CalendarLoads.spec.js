const { test, expect } = require('@playwright/test');

test.describe('Summary Module - Calendar', () => {
	test('TC002_VerifyCalendarLoadsAndDateSelection', async ({ page }) => {
		const email = 'SZ_AutoQA@stratzen.ai';
		const passwordValue = 'StratzenAutomation123';
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

		await page.goto('https://demoapp.stratzen.ai/login');
		await expect(page).toHaveURL(/login/);

		await page.locator('input[type="email"]').fill(email);
		await page.locator('input[type="password"]').fill(passwordValue);
		await page.getByRole('button', { name: /sign in/i }).click();

		await page.waitForURL('https://demoapp.stratzen.ai/summary');

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
