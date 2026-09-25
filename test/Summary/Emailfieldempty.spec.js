import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test.describe('Summary Module - Login', () => {
	test('TC_Login_EmailFieldEmpty', async ({ page }) => {
		await page.setViewportSize({ width: 1600, height: 1400 });

		const baseUrl = process.env.URL
			|| process.env.APP_URL
			|| process.env.BASE_URL
			|| test.info().project.use.baseURL
			|| 'https://demoapp.stratzen.ai';

		const buildUrl = (path) => {
			const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
			const cleanPath = path.startsWith('/') ? path : `/${path}`;
			return `${cleanBaseUrl}${cleanPath}`;
		};

		const passwordValue = process.env.STRATZEN_PASSWORD || 'StratzenAutomation123';

		// Step 1: Navigate to the login page.
		await test.step('Step 1: Navigate to Login Page', async () => {
			await page.goto(buildUrl('/login'), {
				waitUntil: 'domcontentloaded',
				timeout: 90000,
			});

			await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({
				timeout: 30000,
			});
		});

		const emailField = page.getByRole('textbox', { name: 'Email Address' });
		const passwordField = page.getByRole('textbox', { name: 'Password' });

		// Step 2: Keep the email field empty.
		await test.step('Step 2: Keep the Email field empty', async () => {
			await expect(emailField).toBeVisible({ timeout: 10000 });
			await emailField.fill('');
		});

		// Step 3: Enter the password.
		await test.step('Step 3: Enter Password', async () => {
			await expect(passwordField).toBeVisible({ timeout: 10000 });
			await passwordField.fill(passwordValue);
		});

		// Step 4: Click the Sign In button.
		await test.step('Step 4: Click Sign In', async () => {
			await page.getByRole('button', { name: /sign in/i }).click();
		});

		// Step 5: Verify login is blocked and email validation appears.
		await test.step('Step 5: Verify login is blocked and email validation appears', async () => {
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
});
