# Stratzen Linear Playwright Automation Guidelines

## Purpose

This project is used to create and execute automated test scripts for Stratzen.

The automation model is based on linear Playwright scripts.

The primary goal is to generate scripts that are:

- Easy to read
- Easy to execute
- Easy to review
- Closely aligned with the original test case
- Independently executable
- Maintainable without unnecessary framework abstraction

---

## Technology

Use:

- JavaScript
- Playwright Test
- GitHub Copilot
- Playwright MCP when browser exploration is required

Do not use TypeScript unless explicitly requested.

---

## Core Rule: Linear Scripting

Each test case should normally be represented by one independent Playwright test script.

The script must follow the business flow from beginning to end.

Preferred structure:

1. Navigate to the required application or page.
2. Perform the required action.
3. Validate the expected result.
4. Continue to the next business action.
5. Validate the next expected result.
6. Complete the test scenario.

Keep the complete business flow visible inside the test.

---

## No Page Object Model by Default

Do not create Page Object classes for normal Stratzen scripts.

Do not move business actions into separate page classes simply to create abstraction.

Prefer keeping the actual Playwright actions visible.

Only introduce a different abstraction when explicitly requested or when a demonstrated project requirement makes it necessary.

---

## No Unnecessary Helper Functions

Do not create helper functions for simple Playwright actions.

Reusable utilities may be introduced only when there is a genuine repeated technical operation that cannot reasonably remain inside the individual script.

---

## Locator Strategy

Use Playwright's built-in semantic locators whenever possible.

Preferred order:

1. getByRole()
2. getByLabel()
3. getByPlaceholder()
4. getByText()
5. getByTestId()
6. CSS locator when required
7. XPath only when no reliable alternative exists

Prefer stable and meaningful locators.

Avoid:

- Absolute XPath
- Long generated CSS selectors
- DOM-position-dependent selectors
- Selectors based on unstable dynamic values

---

## Assertions

Every important expected business outcome must have an assertion.

Do not create scripts that only perform actions without validating the result.

Assertions should represent the expected result defined by the test case.

---

## Wait Strategy

Do not use arbitrary fixed waits such as waitForTimeout().

Prefer Playwright's built-in waiting and explicit conditions.

Use explicit waits only when there is a legitimate technical reason.

---

## Test Data

Keep test data understandable and close to the test when the data is specific to a single scenario.

Do not introduce an external test-data framework unless it is required.

If external test data is explicitly required, keep the implementation simple and avoid hiding the business flow.

---

## Script Independence

Each test should be capable of executing independently.

Do not make one test depend on another test having run first.

Avoid shared mutable state between test cases.

A test should establish the required application state through its own steps unless the scenario explicitly requires a pre-existing state.

---

## MCP Usage

Playwright MCP may be used to:

- Explore the application
- Navigate through the UI
- Identify elements
- Determine reliable locators
- Understand the application flow
- Validate interactions during script creation

MCP exploration should result in a normal Playwright JavaScript test.

Do not embed unnecessary MCP-specific logic into the generated test.

The final script should remain a standard Playwright test that can execute independently.

---

## Generated Script Quality

When generating a script from a test case:

1. Follow the test case steps in the same logical order.
2. Do not skip business steps.
3. Do not reorder business steps unless the application technically requires it.
4. Preserve the expected result for each important step.
5. Add appropriate Playwright assertions.
6. Keep the script linear.
7. Keep actions visible.
8. Use reliable locators.
9. Avoid unnecessary abstraction.
10. Ensure the resulting script is syntactically valid JavaScript.

---

## Business Step Traceability

Where practical, comments may be used to identify major business steps.

Do not add excessive comments for every individual line.

---

## Error Handling

Do not wrap normal test steps in unnecessary try/catch blocks.

Allow Playwright to report failures naturally.

Use explicit error handling only when the test scenario requires handling an expected application condition.

---

## File Naming

Test scripts should use a clear test-case identifier and meaningful scenario name.

Preferred examples:

- TC001_Login_ValidCredentials.spec.js
- TC002_Login_InvalidPassword.spec.js
- TC003_CreateCustomer.spec.js

Avoid generic names such as:

- test1.spec.js
- script.spec.js
- automation.spec.js

---

## Final Generation Check

Before considering a generated script complete, verify:

- Is this a valid JavaScript Playwright test?
- Does it represent one test case?
- Is the flow linear?
- Are the business steps in the correct order?
- Are important expected results validated?
- Are the locators reliable?
- Are arbitrary waits avoided?
- Is unnecessary abstraction avoided?
- Can the script execute independently?
- Is the script readable by a QA engineer without opening other files?

If any of these conditions are not satisfied, improve the script before finalizing it.

---

## Executable Template

The following template can be used when a script needs to be directly executable in Test Max with minimal setup.

```javascript
import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test('Verify ETF ticker synchronization across Research, Summary and Preferences', async ({ page }) => {
	const username = process.env.STRATZEN_EMAIL || 'SZ_AutoQA@stratzen.ai';
	const password = process.env.STRATZEN_PASSWORD || 'StratzenAutomation123';
	const ticker = 'XLK';

	// ============================================================
	// APPLICATION URL
	// Priority:
	// 1. process.env.URL
	// 2. process.env.APP_URL
	// 3. process.env.BASE_URL
	// 4. fallback URL
	// ============================================================

	const baseUrl = process.env.URL
		|| process.env.APP_URL
		|| process.env.BASE_URL
		|| 'https://demoapp.stratzen.ai';

	const buildUrl = (path) => {
		const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
		const cleanPath = path.startsWith('/') ? path : `/${path}`;
		return `${cleanBaseUrl}${cleanPath}`;
	};

	const loginUrl = buildUrl('/login');

	// ============================================================
	// 1. NAVIGATE TO LOGIN PAGE
	// ============================================================

	await test.step('Navigate to login page', async () => {
		await page.goto(loginUrl, {
			waitUntil: 'domcontentloaded',
			timeout: 30000,
		});

		await expect(
			page.getByRole('heading', { name: 'Welcome Back' }),
		).toBeVisible({ timeout: 30000 });
	});

	// ============================================================
	// 2. ENTER EMAIL
	// ============================================================

	await test.step('Enter email address', async () => {
		const emailInput = page.getByRole('textbox', {
			name: 'Email Address',
		});

		await expect(emailInput).toBeVisible({ timeout: 10000 });
		await emailInput.fill(username);
	});

	// ============================================================
	// 3. ENTER PASSWORD
	// ============================================================

	await test.step('Enter password', async () => {
		const passwordInput = page.getByRole('textbox', {
			name: 'Password',
		});

		await expect(passwordInput).toBeVisible({ timeout: 10000 });
		await passwordInput.fill(password);
	});

	// ============================================================
	// 4. SIGN IN
	// ============================================================

	await test.step('Click Sign In', async () => {
		const signInButton = page.getByRole('button', {
			name: 'Sign In',
		});

		await expect(signInButton).toBeVisible({ timeout: 10000 });
		await signInButton.click();
	});

	// ============================================================
	// 5. VERIFY LOGIN SUCCESS
	// ============================================================

	await test.step('Verify login completed successfully', async () => {
		await expect(
			page.getByRole('link', { name: 'Summary' }),
		).toBeVisible({ timeout: 30000 });
	});

	// ============================================================
	// 6. OPEN RESEARCH
	// ============================================================

	await test.step('Open Research page', async () => {
		const researchLink = page.getByRole('link', {
			name: 'Research',
		});

		await expect(researchLink).toBeVisible({ timeout: 30000 });
		await researchLink.click();

		await expect(
			page.getByRole('tab', { name: 'Watchlist' }),
		).toBeVisible({ timeout: 30000 });
	});

	// ============================================================
	// 7. OPEN WATCHLIST
	// ============================================================

	await test.step('Open Watchlist', async () => {
		const watchlistTab = page.getByRole('tab', {
			name: 'Watchlist',
		});

		await expect(watchlistTab).toBeVisible({ timeout: 30000 });
		await watchlistTab.click();
	});

	// ============================================================
	// 8. OPEN ETFs CATEGORY
	// ============================================================

	const etfTab = page.getByRole('tab', {
		name: /ETFs/i,
	});

	await test.step('Open ETFs category', async () => {
		await expect(etfTab).toBeVisible({ timeout: 30000 });
		await etfTab.click();
	});

	// ============================================================
	// 9. ADD ETF TICKER
	// ============================================================

	await test.step(`Add ETF ticker ${ticker}`, async () => {
		const addTickerButton = page.getByRole('button', {
			name: 'Add Ticker',
		});

		await expect(addTickerButton).toBeVisible({ timeout: 30000 });
		await addTickerButton.click();

		const tickerInput = page.getByRole('textbox', {
			name: 'Ticker Symbol',
		});

		await expect(tickerInput).toBeVisible({ timeout: 10000 });
		await tickerInput.fill(ticker);

		const addButton = page.getByRole('button', {
			name: 'Add',
			exact: true,
		});

		await expect(addButton).toBeVisible({ timeout: 10000 });
		await addButton.click();
	});

	// ============================================================
	// 10. VERIFY ETF IN RESEARCH
	// ============================================================

	await test.step(`Verify ${ticker} appears in Research Watchlist`, async () => {
		await expect(
			page.getByText(ticker, { exact: true }).first(),
		).toBeVisible({ timeout: 30000 });
	});

	// ============================================================
	// 11. NAVIGATE TO SUMMARY
	// ============================================================

	await test.step('Navigate to Summary', async () => {
		const summaryLink = page.getByRole('link', {
			name: 'Summary',
		});

		await expect(summaryLink).toBeVisible({ timeout: 30000 });
		await summaryLink.click();

		await expect(page).toHaveURL(/\/summary(?:\/|$|\?)/, {
			timeout: 30000,
		});
	});

	// ============================================================
	// 12. VERIFY EQUITY MARKET OUTLOOK
	// ============================================================

	await test.step('Verify Equity Market Outlook is visible', async () => {
		await expect(
			page.getByText('Equity Market Outlook', { exact: true }),
		).toBeVisible({ timeout: 30000 });
	});

	// ============================================================
	// 13. VERIFY EQUITIES SECTION
	// ============================================================

	await test.step('Verify EQUITIES section is visible', async () => {
		await expect(
			page.getByText('EQUITIES', { exact: true }),
		).toBeVisible({ timeout: 30000 });
	});

	// ============================================================
	// 14. VERIFY ETF ON SUMMARY
	// ============================================================

	await test.step(`Verify ${ticker} appears on Summary`, async () => {
		await expect(
			page.getByText(ticker, { exact: true }).first(),
		).toBeVisible({ timeout: 30000 });
	});

	// ============================================================
	// 15. OPEN PROFILE
	// ============================================================

	await test.step('Open user profile', async () => {
		const profile = page.getByText('QA', {
			exact: true,
		});

		await expect(profile).toBeVisible({ timeout: 30000 });
		await profile.click();
	});

	// ============================================================
	// 16. OPEN PREFERENCES
	// ============================================================

	await test.step('Open Preferences', async () => {
		const preferences = page.getByText('Preferences', {
			exact: true,
		});

		await expect(preferences).toBeVisible({ timeout: 10000 });
		await preferences.click();
	});

	// ============================================================
	// 17. VERIFY WATCHLIST SECTION
	// ============================================================

	await test.step('Verify Watchlist section is visible', async () => {
		await expect(
			page.getByText('Watchlist', { exact: true }),
		).toBeVisible({ timeout: 30000 });
	});

	// ============================================================
	// 18. OPEN STOCKS & ETFs
	// ============================================================

	await test.step('Open Stocks & ETFs', async () => {
		const stocksEtfs = page.getByText('Stocks & ETFs', {
			exact: true,
		});

		await expect(stocksEtfs).toBeVisible({ timeout: 30000 });
		await stocksEtfs.click();
	});

	// ============================================================
	// 19. VERIFY ETF IN PREFERENCES
	// ============================================================

	await test.step(`Verify ${ticker} appears in Preferences`, async () => {
		await expect(
			page.getByText(ticker, { exact: true }).first(),
		).toBeVisible({ timeout: 30000 });
	});

	console.log(
		`ETF ticker ${ticker} successfully verified in Research, Summary and Preferences.`,
	);
});
```

Use this template when a scenario needs:

- Top-level timeout configuration
- Explicit base URL fallback behavior
- Linear `test.step()` flow
- Role-first semantic locators
- Direct execution without extra helper layers
