import path from 'path';
import fs from 'fs';
import { defineConfig } from 'cypress';
import dotenv from 'dotenv';
import { interceptSnapshotFile } from '~/__tests__/cypress/cypress/utils/snapshotUtils';

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
  },
  requestTimeout: process.env.MOCK ? 5000 : 10000,

  e2e: {
    baseUrl: process.env.BASE_URL,
    specPattern: process.env.MOCK
      ? `cypress/e2e/**/*.(s)?cy.ts`
      : process.env.RECORD
      ? `cypress/e2e/**/*.scy.ts`
      : `cypress/e2e/**/*.(s)?cy.ts`,
    experimentalInteractiveRunEvents: true,
    setupNodeEvents(on) {
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
