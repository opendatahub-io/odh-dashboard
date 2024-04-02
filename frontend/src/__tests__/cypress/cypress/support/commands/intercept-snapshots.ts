import { Interception } from 'cypress/types/net-stubbing';
import { InterceptSnapshot, Snapshot } from '~/__tests__/cypress/cypress/types';
import { interceptSnapshot, waitSnapshot } from '~/__tests__/cypress/cypress/utils/snapshotUtils';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      interceptSnapshot: InterceptSnapshot;
      waitSnapshot(alias: string): Chainable<Interception>;
      readSnapshot(path: string): Cypress.Chainable<{ [key: string]: Snapshot }>;

      /**
       * Visits the URL and performs a login if necessary.
       * Uses credentials supplied by environment variables if not provided.
       *
       * @param url the URL to visit
       * @param credentials login credentials
       */
      visitWithLogin(
        url: string,
        credentials?: { username: string; password: string },
      ): Cypress.Chainable<void>;
    }
  }
}

Cypress.Commands.add('readSnapshot', (path) => cy.task('readJSON', path));

Cypress.Commands.add('waitSnapshot', (alias) => waitSnapshot(alias));

Cypress.Commands.add('interceptSnapshot', (url, alias, controlled) =>
  interceptSnapshot(url, alias, controlled),
);

Cypress.Commands.add(
  'visitWithLogin',
  (
    url,
    credentials = {
      username: Cypress.env('USERNAME') ?? '',
      password: Cypress.env('PASSWORD') ?? '',
    },
  ) => {
    cy.intercept('GET', url).as('visitWithLogin');

    cy.visit(url, { failOnStatusCode: false });

    cy.wait('@visitWithLogin').then((interception) => {
      if (interception.response?.statusCode === 403) {
        // do login
        cy.findByRole('button', { name: 'Log in with OpenShift' }).click();
        cy.findByRole('link', { name: 'customadmins' }).click();
        cy.findByLabelText('Username *').type(credentials.username);
        cy.findByLabelText('Password *').type(credentials.password);
        cy.findByRole('button', { name: 'Log in' }).click();
      } else if (interception.response?.statusCode !== 200) {
        throw new Error(
          `Failed to visit '${url}'. Status code: ${
            interception.response?.statusCode || 'unknown'
          }`,
        );
      } else {
        cy.log('Already logged in');
      }
    });
  },
);
