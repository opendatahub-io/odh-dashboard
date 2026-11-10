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
  it('task group card titles should have no inline padding', () => {
    homePage.visit();
    // Guards against the Lightning CSS minimizer lowering logical properties into
    // :lang() fallbacks whose raised specificity beats PatternFly's contextual
    // `padding: 0` rule for card titles inside card headers.
    homePage
      .findTaskGroupCardTitle('ai-hub')
      .should('have.css', 'padding-left', '0px')
      .and('have.css', 'padding-right', '0px');
  });
});
