const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();
module.exports = defineConfig({
  testDir: './test',
  timeout: 120000,
  workers: 1,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,

  use: {
    baseURL: process.env.BASE_URL || 'https://demoapp.stratzen.ai',
    username: process.env.STRATZEN_EMAIL,
    password: process.env.STRATZEN_PASSWORD,
    outlookUsername: process.env.OUTLOOK_EMAIL,
    outlookPassword: process.env.OUTLOOK_PASSWORD,
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