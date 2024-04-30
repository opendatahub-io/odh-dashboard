import { enabledPage } from '~/__tests__/cypress/cypress/pages/enabled';
import { mockComponents } from '~/__mocks__/mockComponents';
import { homePage } from '~/__tests__/cypress/cypress/pages/home';

describe('Home page', () => {
  it('should not be shown by default', () => {
    homePage.initHomeIntercepts();

    cy.visit('/');
    cy.findByTestId('app-page-title').should('have.text', 'Enabled');
  });
  it('should be shown when enabled', () => {
    homePage.initHomeIntercepts({ disableHome: false });
    homePage.visit();

    // enabled applications page is still navigable
    cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());
    enabledPage.visit(true);
  });
  it('should show the home page hint', () => {
    homePage.initHomeIntercepts({ disableHome: false });
    cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());

    homePage.visit();

    cy.findByTestId('jupyter-hint-icon').should('be.visible');
    cy.findByTestId('hint-body-text').should('contain', 'Jupyter');

    // enabled applications page is still navigable
    cy.findByTestId('home-page-hint-navigate').click();

    cy.findByTestId('enabled-application').should('be.visible');
  });
  it('should hide the home page hint when the notebook controller is disabled.', () => {
    homePage.initHomeIntercepts({ disableHome: false, disableNotebookController: true });
    cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());

    cy.visit('/');

    cy.findByTestId('home-page-hint').should('not.exist');
  });
  it('should hide the home page hint when closed', () => {
    homePage.initHomeIntercepts({ disableHome: false });
    cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());

    homePage.visit();

    // enabled applications page is still navigable
    cy.findByTestId('home-page-hint-close').click();

    cy.findByTestId('home-page-hint').should('not.exist');

    cy.visit('/enabled');
    cy.findByTestId('enabled-application').should('be.visible');

    homePage.visit();
    cy.findByTestId('home-page-hint').should('not.exist');
  });
});
