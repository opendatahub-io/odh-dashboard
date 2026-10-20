import path from 'path';
import { defineConfig } from 'cypress';
import coverage from '@cypress/code-coverage/task';

export default defineConfig({
  viewportWidth: 1440,
  viewportHeight: 1000,
  defaultCommandTimeout: 10000,
  video: true,
  screenshotsFolder: 'results/screenshots',
  videosFolder: 'results/videos',
  reporter: 'junit',
  reporterOptions: {
    mochaFile: path.resolve(__dirname, 'results/junit/results-[hash].xml'),
  },
  env: {
    coverage: process.env.COVERAGE === 'true',
  },
  e2e: {
    setupNodeEvents(on, config) {
      if (config.env.coverage) {
        coverage(on, config);
      }
      return config;
    },
    baseUrl: 'http://127.0.0.1:4021',
    specPattern: 'cypress/tests/mocked/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
  },
});
