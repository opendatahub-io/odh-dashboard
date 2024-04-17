import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockComponents } from '~/__mocks__/mockComponents';
import { enabledPage } from '~/__tests__/cypress/cypress/pages/enabled';

type HandlersProps = {
  disableHome?: boolean;
};

const initIntercepts = ({ disableHome }: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableHome,
    }),
  );
  cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());
};

describe('Home page', () => {
  it('should not be shown by default', () => {
    initIntercepts({});
    cy.visit('/');
    cy.findByTestId('enabled-application').should('be.visible');
  });
  it('should be shown when enabled', () => {
    initIntercepts({ disableHome: false });
    cy.visit('/');
    cy.findByTestId('home-page').should('be.visible');

    // enabled applications page is still navigable
    enabledPage.visit(true);
  });
});
