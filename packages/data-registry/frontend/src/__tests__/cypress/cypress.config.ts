import path from 'path';
import fs from 'fs';
import { defineConfig } from 'cypress';
import coverage from '@cypress/code-coverage/task';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore no types available
import webpack from '@cypress/webpack-preprocessor';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore no types available
import cypressHighResolution from 'cypress-high-resolution';
import { mergeFiles } from 'junit-report-merger';
import { env, BASE_URL } from '~/__tests__/cypress/cypress/utils/testConfig';
import webpackConfig from './webpack.config';

const resultsDir = `${env.CY_RESULTS_DIR || 'results'}/${env.CY_MOCK ? 'mocked' : 'e2e'}`;

export default defineConfig({
  experimentalMemoryManagement: true,
  reporter: 'mocha-junit-reporter',
  reporterOptions: {
    mochaFile: `${resultsDir}/junit/junit-[hash].xml`,
  },
  chromeWebSecurity: false,
  viewportWidth: 1920,
  viewportHeight: 1080,
  numTestsKeptInMemory: 1,
  video: true,
  screenshotsFolder: `${resultsDir}/screenshots`,
  videosFolder: `${resultsDir}/videos`,
  env: {
    MOCK: !!env.CY_MOCK,
    coverage: !!env.CY_COVERAGE,
    codeCoverage: {
      exclude: [path.resolve(__dirname, '../../third_party/**')],
    },
    resolution: 'high',
  },
  defaultCommandTimeout: 10000,
  e2e: {
    baseUrl: BASE_URL,
    specPattern: env.CY_MOCK ? `cypress/tests/mocked/**/*.cy.ts` : `cypress/tests/e2e/**/*.cy.ts`,
    experimentalInteractiveRunEvents: true,
    setupNodeEvents(on, config) {
      cypressHighResolution(on, config);
      coverage(on, config);

      // Configure webpack preprocessor with custom webpack config
      const options = {
        webpackOptions: webpackConfig,
        watchOptions: {},
      };
      on('file:preprocessor', webpack(options));

      on('task', {
        readJSON(filePath: string) {
          const absPath = path.resolve(__dirname, filePath);
          if (fs.existsSync(absPath)) {
            try {
              return Promise.resolve(JSON.parse(fs.readFileSync(absPath, 'utf8')));
            } catch {
              // return default value
            }
          }

          return Promise.resolve({});
        },
        log(message) {
          // eslint-disable-next-line no-console
          console.log(message);
          return null;
        },
        error(message) {
          // eslint-disable-next-line no-console
          console.error(message);
          return null;
        },
        table(message) {
          // eslint-disable-next-line no-console
          console.table(message);
          return null;
        },
      });

      // Delete videos for specs without failing or retried tests
      on('after:spec', (_, results) => {
        if (results.video) {
          // Do we have failures for any retry attempts?
          const failures = results.tests.some((test) =>
            test.attempts.some((attempt) => attempt.state === 'failed'),
          );
          if (!failures) {
            // delete the video if the spec passed and no tests retried
            fs.unlinkSync(results.video);
          }
        }
      });

      on('after:run', async () => {
        // merge junit reports into a single report
        const outputFile = path.join(__dirname, resultsDir, 'junit-report.xml');
        const inputFiles = [`./${resultsDir}/junit/*.xml`];
        await mergeFiles(outputFile, inputFiles);
      });

      return config;
    },
  },
});
