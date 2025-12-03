import { mockComponents } from '@odh-dashboard/internal/__mocks__/mockComponents';
import { enabledPage } from '../../../pages/enabled';
import { homePage } from '../../../pages/home/home';

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
