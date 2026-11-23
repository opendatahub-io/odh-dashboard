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

import '@cypress/code-coverage/support';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import 'cypress-mochawesome-reporter/register';
import './commands';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { CLIENT_API_VERSION } from './commands/api';

Cypress.Keyboard.defaults({
  keystrokeDelay: 0,
});

// Monaco's wordHighlighter contribution drops the promise returned by its
// debounce Delayer (monaco-editor 0.54 wordHighlighter.js), so disposing an
// editor inside the debounce window — e.g. closing the import-collection
// modal right after submit — rejects it with an uncaught CancellationError
// ("Canceled"). That is a library-internal cancellation, not a product error.
Cypress.on('uncaught:exception', (err, _runnable, promise) => {
  // Cypress wraps unhandled-rejection reasons, so match on the name only.
  // The dropped Delayer promise surfaces as an unhandled rejection (Cypress
  // passes the promise), and only the import spec mounts Monaco.
  if (
    err.name === 'Canceled' &&
    promise !== undefined &&
    Cypress.spec.name === 'importCollection.cy.ts'
  ) {
    return false;
  }
  return undefined;
});

beforeEach(() => {
  if (Cypress.env('MOCK')) {
    // fallback: return 404 for all api requests
    cy.intercept({ pathname: '/api/**' }, { statusCode: 404 });

    cy.interceptApi(
      'GET /api/:apiVersion/user',
      {
        path: {
          apiVersion: CLIENT_API_VERSION,
        },
      },
      mockUserSettings({}),
    );

    cy.interceptApi(
      'GET /api/:apiVersion/namespaces',
      {
        path: {
          apiVersion: CLIENT_API_VERSION,
        },
      },
      [mockNamespace({})],
    );
  }
});
