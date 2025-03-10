import { enabledPage } from '~/__tests__/cypress/cypress/pages/enabled';
import { mockComponents } from '~/__mocks__/mockComponents';
import { homePage } from '~/__tests__/cypress/cypress/pages/home/home';

describe('Home page', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());
    homePage.initHomeIntercepts();
  });

  it('should be not shown when disabled', () => {
    homePage.initHomeIntercepts({ disableHardwareProfiles: true });
    homePage.visit();
    homePage.findHint().should('not.exist');
  });

  it('should show the home page hint', () => {
    homePage.initHomeIntercepts({ disableHardwareProfiles: false });
    homePage.visit();
    homePage.findHint().should('exist');
    homePage.findHintText().should('contain', 'Hardware profiles');
  });

  it('should hide the home page hint when closed', () => {
    homePage.initHomeIntercepts({ disableHardwareProfiles: false });
    homePage.visit();
    homePage.findHintCloseButton().click();
    homePage.findHint().should('not.exist');

    enabledPage.visit();
    homePage.returnToHome();
    homePage.findHint().should('not.exist');
  });
});
