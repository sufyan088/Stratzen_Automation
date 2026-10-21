import { test, expect } from '@playwright/test';
import {
	getTestData,
	installNativeDialogHandler,
	resilientLocator,
	safeClick,
	safeFill,
} from './mammothhai-playwright-helpers.js';

test.setTimeout(120000);

test.describe('Summary Module - Login', () => {
	test('TC_Login_EmailFieldEmpty', async ({ page }) => {
		installNativeDialogHandler(page);
		const use = test.info().project.use;
		const destinationUrlStep1 = getTestData('destination_url__step1');

		const baseUrl = process.env.URL
			|| process.env.APP_URL
			|| process.env.BASE_URL
			|| use.baseURL
			|| 'https://demoapp.stratzen.ai';
		const destinationUrl = destinationUrlStep1 || `${String(baseUrl).replace(/\/+$/, '')}/login`;
		const password = use.password || process.env.STRATZEN_PASSWORD;

		if (!destinationUrl) throw new Error('Missing destination_url__step1 / BASEURL test data.');
		if (!password) throw new Error('Missing password in project.use or environment variables.');

		// Step 1: Navigate to the login page.
		await page.goto(destinationUrl, {
			waitUntil: 'domcontentloaded',
			timeout: 90000,
		});
		await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({
			timeout: 30000,
		});

		const emailField = page.getByRole('textbox', { name: 'Email Address' });
		const passwordField = await resilientLocator(page, ['input[type="password"]'], { labelFallback: 'Password', role: 'textbox' });

		// Step 2: Keep the email field empty.
		await expect(emailField).toBeVisible({ timeout: 10000 });
		await emailField.fill('');

		// Step 3: Enter the password.
		await safeFill(passwordField, String(password));
		await expect(page.locator('input[type="password"]').first()).toHaveValue(String(password));

		// Step 4: Click the Sign In button.
		const signInButton = await resilientLocator(page, ['button[type="submit"]'], { labelFallback: 'Sign In', role: 'button' });
		await safeClick(signInButton, { timeout: 15000 });

		// Step 5: Verify login is blocked and email validation appears.
		await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

		const validationMessage = page.getByText(/email.+required|required|enter.+email|please fill/i).first();
		const messageVisible = await validationMessage.isVisible().catch(() => false);
		const ariaInvalid = (await emailField.getAttribute('aria-invalid')) === 'true';
		const htmlInvalid = await emailField.evaluate((el) => {
			if (typeof el.checkValidity !== 'function') {
				return false;
			}
			return !el.checkValidity();
		});

		expect(messageVisible || ariaInvalid || htmlInvalid).toBeTruthy();
	});
});
