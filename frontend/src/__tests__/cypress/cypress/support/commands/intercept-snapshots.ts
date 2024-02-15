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
      visitWithLogin(url: string): Cypress.Chainable<void>;
    }
  }
}

Cypress.Commands.add('visitWithLogin', (url) => {
  cy.intercept('GET', url).as('visitWithLogin');

  cy.visit(url, { failOnStatusCode: false });

  cy.wait('@visitWithLogin').then((interception) => {
    if (interception.response?.statusCode === 403) {
      // do login
      cy.findByRole('button', { name: 'Log in with OpenShift' }).click();
      cy.findByRole('link', { name: 'customadmins' }).click();
      cy.findByLabelText('Username *').type(Cypress.env('USERNAME'));
      cy.findByLabelText('Password *').type(Cypress.env('PASSWORD'));
      cy.findByRole('button', { name: 'Log in' }).click();
    } else if (interception.response?.statusCode !== 200) {
      throw new Error(
        `Failed to visit '${url}'. Status code: ${interception.response?.statusCode || 'unknown'}`,
      );
    } else {
      cy.log('Already logged in');
    }
  });
});

Cypress.Commands.add('readSnapshot', (path) => cy.task('readJSON', path));

Cypress.Commands.add('waitSnapshot', (alias) => waitSnapshot(alias));

Cypress.Commands.add('interceptSnapshot', (url, alias, controlled) =>
  interceptSnapshot(url, alias, controlled),
);
