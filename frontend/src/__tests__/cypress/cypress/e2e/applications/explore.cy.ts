import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockStatus } from '~/__mocks__/mockStatus';
import { explorePage } from '~/__tests__/cypress/cypress/pages/explore';
import { mockComponents } from '~/__mocks__/mockComponents';

describe('Explore Page', { testIsolation: false }, () => {
  beforeEach(() => {
    cy.intercept('/api/dsc/status', mockDscStatus({}));
    cy.intercept('/api/status', mockStatus());
    cy.intercept('/api/config', mockDashboardConfig({}));
    cy.intercept('/api/components', mockComponents());
    explorePage.visit();
  });

  it('should have selectable cards', () => {
    explorePage.findExploreCard('jupyter').click();
    explorePage.findDrawerPanel().should('be.visible');
  });

  it('hidden app should not exist', () => {
    explorePage.visit();
    explorePage.findExploreCard('rhoai').should('not.exist');
  });

  it('card title should be visible', () => {
    cy.get('span').should('contain', 'Jupyter');
  });
});
