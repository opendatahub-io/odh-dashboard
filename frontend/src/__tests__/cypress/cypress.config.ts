import path from 'path';
import fs from 'fs';
import { defineConfig } from 'cypress';
import dotenv from 'dotenv';
import coverage from '@cypress/code-coverage/task';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore no types available
import cypressHighResolution from 'cypress-high-resolution';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore no types available
import { beforeRunHook, afterRunHook } from 'cypress-mochawesome-reporter/lib';
import { mergeFiles } from 'junit-report-merger';
import { interceptSnapshotFile } from '~/__tests__/cypress/cypress/utils/snapshotUtils';
import { setup as setupWebsockets } from '~/__tests__/cypress/cypress/support/websockets';

[
  `.env.cypress${process.env.CY_MOCK ? '.mock' : ''}.local`,
  `.env.cypress${process.env.CY_MOCK ? '.mock' : ''}`,
  '.env.local',
  '.env',
].forEach((file) =>
  dotenv.config({
    path: path.resolve(__dirname, '../../../', file),
  }),
);

const resultsDir = `${process.env.CY_RESULTS_DIR || 'results'}/${
  process.env.CY_MOCK ? 'mocked' : 'e2e'
}`;

export default defineConfig({
  experimentalMemoryManagement: true,
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
  numTestsKeptInMemory: 1,
  video: true,
  screenshotsFolder: `${resultsDir}/screenshots`,
  videosFolder: `${resultsDir}/videos`,
  env: {
    MOCK: !!process.env.CY_MOCK,
    LOGIN_USERNAME: process.env.LOGIN_USERNAME,
    LOGIN_PASSWORD: process.env.LOGIN_PASSWORD,
    LOGIN_PROVIDER: process.env.LOGIN_PROVIDER,
    RECORD: !!process.env.CY_RECORD,
    WS_PORT: process.env.CY_WS_PORT,
    coverage: !!process.env.CY_COVERAGE,
    codeCoverage: {
      exclude: [path.resolve(__dirname, '../../third_party/**')],
    },
    ODH_PRODUCT_NAME: process.env.ODH_PRODUCT_NAME,
    resolution: 'high',
  },
  defaultCommandTimeout: 10000,
  e2e: {
    baseUrl: process.env.BASE_URL,
    specPattern: process.env.CY_MOCK
      ? `cypress/tests/mocked/**/*.cy.ts`
      : process.env.CY_RECORD
      ? `cypress/tests/mocked/**/*.scy.ts`
      : `cypress/tests/e2e/**/*.cy.ts`,
    experimentalInteractiveRunEvents: true,
    setupNodeEvents(on, config) {
      cypressHighResolution(on, config);
      coverage(on, config);
      setupWebsockets(on, config);
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

      if (process.env.CY_RECORD) {
        on('before:spec', (spec) => {
          // delete previous snapshots for the spec
          try {
            fs.unlinkSync(interceptSnapshotFile(spec.absolute));
          } catch {
            // ignore
          }
        });
      }

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
