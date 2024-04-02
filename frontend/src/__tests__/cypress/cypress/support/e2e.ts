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

import './commands';
import chaiSubset from 'chai-subset';
import { addCommands as webSocketsAddCommands } from './websockets';

chai.use(chaiSubset);

webSocketsAddCommands();

Cypress.Keyboard.defaults({
  keystrokeDelay: 0,
});

beforeEach(() => {
  if (Cypress.env('MOCK')) {
    // fallback: return 404 for all api requests
    cy.intercept({ pathname: '/api/**' }, { statusCode: 404 });

    // return empty k8s resource list
    cy.intercept(
      { pathname: '/api/k8s/apis/*/*/*' },
      {
        statusCode: 200,
        body: {
          apiVersion: 'unknown',
          metadata: {},
          items: [],
        },
      },
    );

    // return empty k8s resource list for namespaced requests
    cy.intercept(
      { pathname: '/api/k8s/apis/*/*/namespaces/*/*' },
      {
        statusCode: 200,
        body: {
          apiVersion: 'unknown',
          metadata: {},
          items: [],
        },
      },
    );
  }
});
