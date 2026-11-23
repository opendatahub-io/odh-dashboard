import '@testing-library/cypress/add-commands';
import 'cypress-axe';
import '@cypress/code-coverage/support';

beforeEach(() => {
  // Later scenario intercepts take precedence. Unmocked HTTP service calls fail loudly.
  cy.intercept({ resourceType: /xhr|fetch/ }, (request) => {
    throw new Error(`Unmocked portal request: ${request.method} ${request.url}`);
  });
});

Cypress.on('window:before:load', (win) => {
  win.sessionStorage.clear();
});
