import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { defineConfig } from 'cypress';
import coverage from '@cypress/code-coverage/task';
// @ts-expect-error: Types are not available for this third-party library
import registerCypressGrep from '@cypress/grep/src/plugin';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore no types available
import webpack from '@cypress/webpack-preprocessor';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore no types available
import cypressHighResolution from 'cypress-high-resolution';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore no types available
import { beforeRunHook, afterRunHook } from 'cypress-mochawesome-reporter/lib';
import { mergeFiles } from 'junit-report-merger';
import { env, BASE_URL } from '~/__tests__/cypress/cypress/utils/testConfig';
import { logToConsole, LogLevel } from '~/__tests__/cypress/cypress/utils/logger';
import { setup as setupWebsockets } from '~/__tests__/cypress/cypress/support/websockets';
import webpackConfig from './webpack.config';

const resultsDir = `${env.CY_RESULTS_DIR || 'results'}/${env.CY_MOCK ? 'mocked' : 'e2e'}`;

export default defineConfig({
  experimentalMemoryManagement: true,
  // Disable watching only if env variable `CY_WATCH=false`
  watchForFileChanges: env.CY_WATCH ? env.CY_WATCH !== 'false' : undefined,
  // Use relative path as a workaround to https://github.com/cypress-io/cypress/issues/6406
  reporter: '../../../node_modules/cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'cypress-mochawesome-reporter, mocha-junit-reporter',
    mochaJunitReporterReporterOptions: {
      mochaFile: `${resultsDir}/junit/junit-[hash].xml`,
    },
    cypressMochawesomeReporterReporterOptions: {
      charts: true,
      embeddedScreenshots: false,
      ignoreVideos: false,
      inlineAssets: true,
      reportDir: resultsDir,
      videoOnFailOnly: true,
    },
  },
  chromeWebSecurity: false,
  viewportWidth: 1920,
  viewportHeight: 1080,
  videoCompression: true,
  numTestsKeptInMemory: 1,
  video: true,
  screenshotsFolder: `${resultsDir}/screenshots`,
  videosFolder: `${resultsDir}/videos`,
  env: {
    MOCK: !!env.CY_MOCK,
    WS_PORT: env.CY_WS_PORT ?? '9002',
    coverage: !!env.CY_COVERAGE,
    codeCoverage: {
      exclude: [path.resolve(__dirname, '../../third_party/**')],
    },
    resolution: 'high',
    grepFilterSpecs: true,
  },
  defaultCommandTimeout: 10000,
  e2e: {
    baseUrl: BASE_URL,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
    specPattern: env.CY_MOCK ? `cypress/tests/mocked/**/*.cy.ts` : `cypress/tests/e2e/**/*.cy.ts`,
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    experimentalInteractiveRunEvents: true,
    setupNodeEvents(on, config) {
      registerCypressGrep(config);
      cypressHighResolution(on, config);
      coverage(on, config);
      setupWebsockets(on, config);

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
              const fileContent = fs.readFileSync(absPath, 'utf8');
              // Check if file is YAML or JSON based on extension
              if (absPath.endsWith('.yml') || absPath.endsWith('.yaml')) {
                return Promise.resolve(yaml.load(fileContent));
              }
              return Promise.resolve(JSON.parse(fileContent));
            } catch {
              // return default value
            }
          }

          return Promise.resolve({});
        },
        log(message) {
          return logToConsole(LogLevel.INFO, message);
        },
        error(message) {
          return logToConsole(LogLevel.ERROR, message);
        },
        table(message) {
          return logToConsole(LogLevel.TABLE, message);
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

      on('before:run', async (details) => {
        // cypress-mochawesome-reporter
        await beforeRunHook(details);
      });

      on('after:run', async () => {
        // cypress-mochawesome-reporter
        await afterRunHook();

        // merge junit reports into a single report
        const outputFile = path.join(__dirname, resultsDir, 'junit-report.xml');
        const inputFiles = [`./${resultsDir}/junit/*.xml`];
        await mergeFiles(outputFile, inputFiles);
      });

      return config;
    },
  },
});
