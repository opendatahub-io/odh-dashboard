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

// Import commands.ts using ES2015 syntax:
import '~/__tests__/cypress/cypress/support/commands';
import { getOcToken } from '~/__tests__/cypress/cypress/utils/oc_commands/auth';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Disable Cypress Chrome web security for easier testing
Cypress.on('uncaught:exception', () => {
  // returning false here prevents Cypress from
  // failing the test on uncaught exceptions
  return false;
});

// Setup global configuration
Cypress.Keyboard.defaults({
  keystrokeDelay: 0,
});

// Setup authentication for E2E tests (not needed in mock mode)
before(() => {
  if (!Cypress.env('MOCK')) {
    cy.log('Setting up authentication for E2E tests');
    getOcToken().then((token) => {
      if (token) {
        Cypress.env('AUTH_TOKEN', token);
        cy.intercept('**/api/v1/**', (req) => {
          // eslint-disable-next-line no-param-reassign
          req.headers.Authorization = `Bearer ${token}`;
        }).as('apiWithAuth');
        cy.log('OpenShift token loaded - API requests will include Authorization header');
        cy.log(`Token preview: ${token.substring(0, 20)}...`);
      } else {
        cy.log('No OpenShift token found - run "oc login" first');
      }
    });
  }
});

// Add custom global configurations here
beforeEach(() => {
  // Add any global setup that should run before each test
});
