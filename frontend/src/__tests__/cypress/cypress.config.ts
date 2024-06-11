import path from 'path';
import fs from 'fs';
import { defineConfig } from 'cypress';
import dotenv from 'dotenv';
import coverage from '@cypress/code-coverage/task';
import { interceptSnapshotFile } from '~/__tests__/cypress/cypress/utils/snapshotUtils';
import { setup as setupWebsockets } from '~/__tests__/cypress/cypress/support/websockets';

[
  `.env.cypress${process.env.MOCK ? '.mock' : ''}.local`,
  `.env.cypress${process.env.MOCK ? '.mock' : ''}`,
  '.env.local',
  '.env',
].forEach((file) =>
  dotenv.config({
    path: path.resolve(__dirname, '../../../', file),
  }),
);

export default defineConfig({
  chromeWebSecurity: false,
  viewportWidth: 1440,
  viewportHeight: 900,
  numTestsKeptInMemory: 1,
  env: {
    MOCK: !!process.env.MOCK,
    LOGIN_USERNAME: process.env.LOGIN_USERNAME,
    LOGIN_PASSWORD: process.env.LOGIN_PASSWORD,
    LOGIN_PROVIDER: process.env.LOGIN_PROVIDER,
    RECORD: !!process.env.RECORD,
    WS_PORT: process.env.WS_PORT,
    coverage: !!process.env.COVERAGE,
    codeCoverage: {
      exclude: [path.resolve(__dirname, '../../third_party/**')],
    },
    ODH_PRODUCT_NAME: process.env.ODH_PRODUCT_NAME,
  },
  defaultCommandTimeout: 10000,
  e2e: {
    baseUrl: process.env.BASE_URL,
    specPattern: process.env.MOCK
      ? `cypress/tests/mocked/**/*.cy.ts`
      : process.env.RECORD
      ? `cypress/tests/mocked/**/*.scy.ts`
      : `cypress/tests/e2e/**/*.cy.ts`,
    experimentalInteractiveRunEvents: true,
    setupNodeEvents(on, config) {
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

      if (process.env.RECORD) {
        on('before:spec', (spec) => {
          // delete previous snapshots for the spec
          try {
            fs.unlinkSync(interceptSnapshotFile(spec.absolute));
          } catch {
            // ignore
          }
        });
      }
      return config;
    },
  },
});
