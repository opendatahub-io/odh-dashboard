/**
 * Module Federation Mock Utilities for Cypress Tests
 *
 * This file provides utilities to mock module federation behavior
 * during Cypress tests to prevent runtime errors.
 */

/**
 * Mock remote entry content that provides a basic module federation interface
 */
export const createMockRemoteEntry = (moduleName: string): string => `
  // Mock module federation remote entry for ${moduleName}
  (function() {
    if (!window.__FEDERATION__) {
      window.__FEDERATION__ = {};
    }
    
    if (!window.__FEDERATION__.moduleMap) {
      window.__FEDERATION__.moduleMap = {};
    }
    
    // Mock the module exports
    window.__FEDERATION__.moduleMap['${moduleName}'] = {
      get: function(scope) {
        if (scope === 'extensions') {
          return Promise.resolve({
            default: []
          });
        }
        return Promise.resolve({});
      },
      init: function() {
        return Promise.resolve();
      }
    };
    
    // Export for ES modules compatibility
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = window.__FEDERATION__.moduleMap['${moduleName}'];
    }
  })();
`;

/**
 * Cypress command to set up module federation mocks
 */
export const setupModuleFederationMocks = (modules: string[] = ['modelRegistry']): void => {
  modules.forEach((moduleName) => {
    // Mock the remote entry file
    cy.intercept(
      { pathname: `/_mf/${moduleName}/remoteEntry.js` },
      {
        statusCode: 200,
        headers: { 'content-type': 'application/javascript' },
        body: createMockRemoteEntry(moduleName),
      },
    );

    // Mock the extensions endpoint
    cy.intercept(
      { url: `**/_mf/${moduleName}/**/extensions` },
      {
        statusCode: 200,
        headers: { 'content-type': 'application/javascript' },
        body: 'export default [];',
      },
    );
  });

  // Mock any other module federation paths with 404
  cy.intercept({ pathname: '/_mf/**' }, { statusCode: 404 });
};

/**
 * Add the command to Cypress
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      setupModuleFederationMocks: (modules?: string[]) => Chainable<void>;
    }
  }
}

Cypress.Commands.add('setupModuleFederationMocks', setupModuleFederationMocks);
