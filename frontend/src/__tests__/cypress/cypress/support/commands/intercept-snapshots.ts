import type { Interception } from 'cypress/types/net-stubbing';
import type { InterceptSnapshot, Snapshot } from '#~/__tests__/cypress/cypress/types';
import { interceptSnapshot, waitSnapshot } from '#~/__tests__/cypress/cypress/utils/snapshotUtils';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      interceptSnapshot: InterceptSnapshot;
      waitSnapshot: (alias: string) => Chainable<Interception>;
      readSnapshot: (path: string) => Cypress.Chainable<{ [key: string]: Snapshot }>;
    }
  }
}

Cypress.Commands.add('readSnapshot', (path) => cy.task('readJSON', path));

Cypress.Commands.add('waitSnapshot', (alias) => waitSnapshot(alias));

Cypress.Commands.add('interceptSnapshot', (url, alias, controlled) =>
  interceptSnapshot(url, alias, controlled),
);
