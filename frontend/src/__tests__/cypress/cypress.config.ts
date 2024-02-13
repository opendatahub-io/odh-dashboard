import path from 'path';
import fs from 'fs';
import { defineConfig } from 'cypress';
import dotenv from 'dotenv';
import { interceptSnapshotFile } from '~/__tests__/cypress/cypress/utils/snapshotUtils';
import { setup as setupWebsockets } from '~/__tests__/cypress/cypress/support/websockets';

dotenv.config({
  path: path.resolve(__dirname, `../../../.env.cypress${process.env.MOCK ? '.mock' : ''}`),
});
dotenv.config({
  path: path.resolve(__dirname, `../../../.env.cypress${process.env.MOCK ? '.mock' : ''}.local`),
});

export default defineConfig({
  chromeWebSecurity: false,
  viewportWidth: 1440,
  viewportHeight: 900,
  env: {
    MOCK: !!process.env.MOCK,
    USERNAME: process.env.USERNAME,
    PASSWORD: process.env.PASSWORD,
    RECORD: !!process.env.RECORD,
    WS_PORT: process.env.WS_PORT,
  },
  defaultCommandTimeout: 10000,
  e2e: {
    baseUrl: process.env.BASE_URL,
    specPattern: process.env.MOCK
      ? `cypress/e2e/**/*.(s)?cy.ts`
      : process.env.RECORD
      ? `cypress/e2e/**/*.scy.ts`
      : `cypress/e2e/**/*.(s)?cy.ts`,
    experimentalInteractiveRunEvents: true,
    setupNodeEvents(on, config) {
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
    },
  },
});
