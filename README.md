# Stratzen AI – Linear Playwright Framework (JavaScript)

A minimal **local-only**, **CommonJS JavaScript**, **single-file linear test** project. All automation logic is intentionally kept in `test/stratzen.spec.js`; no Page Object Model, helpers, fixtures, Jenkins, or Allure is included.

## Prerequisites

- Node.js LTS and npm
- Authorized access to the Stratzen test application

## Step 1 – Setup

Open a terminal in this folder:

```powershell
npm install
npx playwright install chromium
Copy-Item .env.example .env
```

Edit `.env` only if needed and never commit it:

```dotenv
BASE_URL=https://demoapp.stratzen.ai
STRATZEN_EMAIL=
STRATZEN_PASSWORD=
```

## Step 2 – Run the full single-file suite

```powershell
npm test
```

To watch the browser:

```powershell
npm run test:headed
```

## Step 3 – Run one individual test case

```powershell
npm run test:one -- "Invalid email"
```

The framework includes two active login scenarios and additional module placeholders (Summary, Research, Preferences, Logout) marked `test.skip` until selectors and acceptance criteria are validated in the live app.

The login selectors are intentionally conservative and may require live-UI verification:

- Email textbox label matching
- Login button label matching
- Validation message text matching

## Step 4 – Review the report

```powershell
npm run report
```

The HTML report is written to `playwright-report/index.html`. Failure screenshots and traces are in `test-results/`. These paths are excluded from Git.

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Run all tests in the `test` folder headlessly in Chromium |
| `npm run test:all` | Same as `npm test` |
| `npm run test:headed` | Show the browser |
| `npm run test:one -- "<test name>"` | Run one test by name (grep) |
| `npm run test:debug` | Open Playwright Inspector |
| `npm run report` | Open the HTML report |

## Architecture

```text
Stratzen-Linear-Framework/
├── test/
│   └── stratzen.spec.js
├── playwright.config.js
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Scope and limitations

- Local execution only; no CI/CD integration.
- One Chromium worker for reproducible linear execution.
- No committed passwords, reusable authenticated storage, or hard-coded real credentials.
- Summary, Research, Preferences, and Logout scenarios are scaffolded as skipped tests until live selectors are verified.
