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
