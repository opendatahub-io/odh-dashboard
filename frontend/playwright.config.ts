import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
const dotenv = require('dotenv');
dotenv.config({ path: './.env.test.local' });
dotenv.config({ path: './.env.test' });
dotenv.config({ path: './.env' });
/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  timeout: 60000,
  testDir: 'src/__tests__',
  testMatch: ['/integration/**/*.spec.ts', '/e2e/**/*.spec.ts'],
  /* Run tests in files in parallel */
  fullyParallel: !!process.env.E2E,
  /* Opt out of parallel tests on CI. */
  workers: process.env.E2E ? undefined : 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E ? process.env.E2E_DASHBOARD_URL : 'http://localhost:6006',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // start storybook server only when not running e2e tests
  webServer: !process.env.E2E
    ? {
        command: 'npm run storybook',
        url: 'http://localhost:6006/',
        reuseExistingServer: true,
      }
    : undefined,
});
