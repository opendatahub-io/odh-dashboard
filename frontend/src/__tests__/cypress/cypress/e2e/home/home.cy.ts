import { enabledPage } from '~/__tests__/cypress/cypress/pages/enabled';
import { mockComponents } from '~/__mocks__/mockComponents';
import { homePage } from '~/__tests__/cypress/cypress/pages/home';

describe('Home page', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());
    homePage.initHomeIntercepts();
  });
  it('should be shown by default', () => {
    homePage.visit();

    // enabled applications page is still navigable
    enabledPage.visit();
  });
  it('should be not shown when disabled', () => {
    homePage.initHomeIntercepts({ disableHome: true });
    cy.visit('/');
    cy.findByTestId('app-page-title').should('have.text', 'Enabled');
  });
  it('should show the home page hint', () => {
    homePage.visit();

    cy.findByTestId('jupyter-hint-icon').should('be.visible');
    cy.findByTestId('hint-body-text').should('contain', 'Jupyter');

    // enabled applications page is still navigable
    cy.findByTestId('home-page-hint-navigate').click();

    cy.findByTestId('enabled-application').should('be.visible');
  });
  it('should hide the home page hint when the notebook controller is disabled.', () => {
    homePage.initHomeIntercepts({ disableNotebookController: true });
    cy.visit('/');

    cy.findByTestId('home-page-hint').should('not.exist');
  });
  it('should hide the home page hint when closed', () => {
    homePage.visit();

    cy.findByTestId('home-page-hint-close').click();
    cy.findByTestId('home-page-hint').should('not.exist');

    // hint should not reappear when home page is navigated to
    cy.visit('/enabled');
    cy.findByTestId('enabled-application').should('be.visible');

    homePage.visit();
    cy.findByTestId('home-page-hint').should('not.exist');
  });
});
