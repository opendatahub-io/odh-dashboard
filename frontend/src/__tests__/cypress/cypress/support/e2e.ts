// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************
// @ts-expect-error: Types are not available for this third-party library
import registerCypressGrep from '@cypress/grep';

registerCypressGrep();

import chaiSubset from 'chai-subset';
import '@cypress/code-coverage/support';
import 'cypress-mochawesome-reporter/register';
import './commands';
import { asProjectAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { addCommands as webSocketsAddCommands } from './websockets';
import 'cypress-plugin-steps';

chai.use(chaiSubset);

webSocketsAddCommands();

Cypress.Keyboard.defaults({
  keystrokeDelay: 0,
});

before(() => {
  // disable Cypress's default behavior of logging all XMLHttpRequests and fetches
  cy.intercept({ resourceType: /xhr|fetch/ }, { log: false });
});

beforeEach(() => {
  if (Cypress.env('MOCK')) {
    // fallback: return 404 for all api requests
    cy.intercept({ pathname: '/api/**' }, { statusCode: 404 });

    // default intercepts
    asProjectAdminUser();
  }
});
