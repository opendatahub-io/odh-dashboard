import { enabledPage } from '#~/__tests__/cypress/cypress/pages/enabled';
import { mockComponents } from '#~/__mocks__/mockComponents';
import { homePage } from '#~/__tests__/cypress/cypress/pages/home/home';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';

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
    homePage.visit(false);
    enabledPage.shouldHaveEnabledPageSection();
  });
  it('should show the home page hint', () => {
    homePage.visit();
    homePage.findJupyterIcon().should('be.visible');
    homePage.findHintText().should('contain', 'Jupyter');

    // // enabled applications page is still navigable
    homePage.findHintLink().click();
    verifyRelativeURL('/enabled');
  });

  it('should hide the home page hint when the notebook controller is disabled.', () => {
    homePage.initHomeIntercepts({ disableNotebookController: true });
    homePage.visit();
    homePage.findHint().should('not.exist');
  });

  it('should hide the home page hint when closed', () => {
    homePage.visit();
    homePage.findHintCloseButton().click();
    homePage.findHint().should('not.exist');

    // hint should not reappear when home page is navigated to
    enabledPage.visit();
    enabledPage.shouldHaveEnabledPageSection();
    homePage.returnToHome();
    homePage.findHint().should('not.exist');
  });
});
