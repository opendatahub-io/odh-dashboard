import { enabledPage } from '#~/__tests__/cypress/cypress/pages/enabled';
import { mockComponents } from '#~/__mocks__/mockComponents';
import { homePage } from '#~/__tests__/cypress/cypress/pages/home/home';

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
});
