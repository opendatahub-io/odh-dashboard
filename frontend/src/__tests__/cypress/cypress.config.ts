import * as path from 'path';
import * as fs from 'fs';

// @ts-expect-error: Types are not available for this third-party library
import registerCypressGrep from '@cypress/grep/src/plugin';
import { defineConfig } from 'cypress';
import coverage from '@cypress/code-coverage/task';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore no types available
import cypressHighResolution from 'cypress-high-resolution';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore no types available
import { beforeRunHook, afterRunHook } from 'cypress-mochawesome-reporter/lib';
import { mergeFiles } from 'junit-report-merger';
import { getModuleFederationConfigs } from '@odh-dashboard/app-config';
import { interceptSnapshotFile } from './cypress/utils/snapshotUtils';
import { setup as setupWebsockets } from './cypress/support/websockets';
import { env, cypressEnv, BASE_URL } from './cypress/utils/testConfig';
import { extractHttpsUrlsWithLocation } from './cypress/utils/urlExtractor';
import { validateHttpsUrls } from './cypress/utils/urlValidator';
import { logToConsole, LogLevel } from './cypress/utils/logger';

const getCyEnvVariables = (envVars: Record<string, string | undefined>) => {
  return Object.fromEntries(
    Object.keys(envVars)
      .filter((key) => key.startsWith('CY_'))
      .map((key) => [key, envVars[key]]),
  );
};

const resultsDir = `${env.CY_RESULTS_DIR || 'results'}/${env.CY_MOCK ? 'mocked' : 'e2e'}`;

export default defineConfig({
  experimentalMemoryManagement: true,
  // Disable watching only if env variable `CY_WATCH=false`
  watchForFileChanges: env.CY_WATCH ? env.CY_WATCH !== 'false' : undefined,
  // Use relative path as a workaround to https://github.com/cypress-io/cypress/issues/6406
  reporter: '../../../../node_modules/cypress-multi-reporters',
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
    ...getCyEnvVariables(env),
    ...cypressEnv,
    MOCK: !!env.CY_MOCK,
    RECORD: !!env.CY_RECORD,
    WS_PORT: env.CY_WS_PORT ?? '9002',
    coverage: !!env.CY_COVERAGE,
    codeCoverage: {
      exclude: [path.resolve(__dirname, '../../third_party/**')],
    },
    ODH_PRODUCT_NAME: env.ODH_PRODUCT_NAME,
    resolution: 'high',
    grepFilterSpecs: true,
    mfConfigs: getModuleFederationConfigs(true),
  },
  defaultCommandTimeout: 10000,
  e2e: {
    baseUrl: BASE_URL,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
    specPattern: env.CY_MOCK
      ? `cypress/tests/mocked/**/*.cy.ts`
      : env.CY_RECORD
      ? `cypress/tests/mocked/**/*.scy.ts`
      : `cypress/tests/e2e/**/*.cy.ts`,
    experimentalInteractiveRunEvents: true,
    setupNodeEvents(on, config) {
      registerCypressGrep(config);
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

        extractHttpsUrls(directory: string) {
          return extractHttpsUrlsWithLocation(directory);
        },
        validateHttpsUrls(urls: string[]) {
          return validateHttpsUrls(urls);
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
        deleteFile(filePath: string) {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
            return Promise.resolve(null);
          } catch (error) {
            return Promise.resolve(null);
          }
        },
      });

      if (config.env.CY_RECORD) {
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
            test.attempts[config.env.MOCK ? 'every' : 'some'](
              (attempt) => attempt.state === 'failed',
            ),
          );
          if (!failures) {
            // delete the video if the spec passed and no tests retried
            fs.rmSync(results.video);
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

      // Apply retries only for tests in the "e2e" folder. 2 retries by default, after a test failure.
      // Set CY_RETRY=N env var for the number of retries (CY_RETRY=0 means no retries).
      const retryConfig =
        config.env.CY_RETRY !== undefined
          ? { runMode: Math.max(0, parseInt(config.env.CY_RETRY) || 0), openMode: 0 }
          : !config.env.CY_RECORD
          ? { runMode: 2, openMode: 0 }
          : config.retries;

      return {
        ...config,
        retries: retryConfig,
      };
    },
  },
});
