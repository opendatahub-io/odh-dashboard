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
  it('should show the home page hint', () => {
    initHomeIntercepts({ disableHome: false });
    cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());

    cy.visit('/');
    cy.findByTestId('home-page-hint').should('be.visible');

    cy.findByTestId('jupyter-hint-icon').should('be.visible');
    cy.findByTestId('hint-body-text').should('contain', 'Jupyter');

    // enabled applications page is still navigable
    cy.findByTestId('home-page-hint-navigate').click();

    cy.findByTestId('enabled-application').should('be.visible');
  });
  it('should hide the home page hint when the notebook controller is disabled.', () => {
    initHomeIntercepts({ disableHome: false, disableNotebookController: true });
    cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());

    cy.visit('/');

    cy.findByTestId('home-page-hint').should('not.exist');
  });
  it('should hide the home page hint when closed', () => {
    initHomeIntercepts({ disableHome: false });
    cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());

    cy.visit('/');
    cy.findByTestId('home-page-hint').should('be.visible');

    // enabled applications page is still navigable
    cy.findByTestId('home-page-hint-close').click();

    cy.findByTestId('home-page-hint').should('not.exist');

    cy.visit('/enabled');
    cy.findByTestId('enabled-application').should('be.visible');

    cy.visit('/');
    cy.findByTestId('home-page-hint').should('not.exist');
  });
});
