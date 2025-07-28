import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    supportFile: 'src/__tests__/cypress/support/e2e.ts',
    specPattern: 'src/__tests__/cypress/tests/**/*.cy.{js,jsx,ts,tsx}',
    fixturesFolder: 'src/__tests__/cypress/fixtures',
    screenshotsFolder: 'src/__tests__/cypress/screenshots',
    videosFolder: 'src/__tests__/cypress/videos',
    downloadsFolder: 'src/__tests__/cypress/downloads',

    setupNodeEvents() {
      // implement node event listeners here
    },

    // Test configuration
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,
    responseTimeout: 30000,

    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,

    // Video and screenshot settings
    video: false,
    screenshotOnRunFailure: true,

    // Browser settings
    chromeWebSecurity: false,

    // Test isolation
    testIsolation: true,

    // Retry configuration
    retries: {
      runMode: 2,
      openMode: 0,
    },
  },
});
