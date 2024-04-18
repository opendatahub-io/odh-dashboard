import { enabledPage } from '~/__tests__/cypress/cypress/pages/enabled';
import { initHomeIntercepts } from '~/__tests__/cypress/cypress/e2e/home/homeUtils';
import { mockComponents } from '~/__mocks__/mockComponents';

describe('Home page', () => {
  it('should not be shown by default', () => {
    initHomeIntercepts();

    cy.visit('/');
    cy.findByTestId('app-page-title').should('have.text', 'Enabled');
  });
  it('should be shown when enabled', () => {
    initHomeIntercepts({ disableHome: false });
    cy.visit('/');
    cy.findByTestId('home-page').should('be.visible');

    // enabled applications page is still navigable
    cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());
    enabledPage.visit(true);
  });
});
