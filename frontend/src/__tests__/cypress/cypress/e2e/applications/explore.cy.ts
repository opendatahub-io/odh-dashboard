import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockStatus } from '~/__mocks__/mockStatus';
import { explorePage } from '~/__tests__/cypress/cypress/pages/explore';
import { mockComponents } from '~/__mocks__/mockComponents';

const initIntercepts = () => {
  cy.intercept('/api/dsc/status', mockDscStatus({}));
  cy.intercept('/api/status', mockStatus());
  cy.intercept('/api/config', mockDashboardConfig({}));
  cy.intercept('/api/components', mockComponents());
};

describe('Explore Page', { testIsolation: false }, () => {
  it('should have selectable cards', () => {
    initIntercepts();

    explorePage.visit();
    explorePage.findExploreCard('jupyter').click();
    explorePage.findDrawerPanel().should('be.visible');
  });
});
