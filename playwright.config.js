const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,

  use: {
    baseURL: 'https://demoapp.stratzen.ai',
    headless: false,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    actionTimeout: 10000,
  },

  projects: [
    {
      name: 'chrome',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
        ...devices['Desktop Chrome'],
      },
    },
  ],

  outputDir: 'test-results',
});