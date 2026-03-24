import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { tabRoutePage } from '../../../pages/tabRoutePage';

const initIntercepts = () => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.MODEL_REGISTRY]: { managementState: 'Managed' },
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelCatalog: false,
      disableModelRegistry: false,
      disableModelServing: false,
    }),
  );
};

describe('Tab Route Page Navigation', () => {
  describe('Models tab-route page', () => {
    it('should show tabs and navigate between them on click', () => {
      initIntercepts();
      tabRoutePage.visit('/ai-hub/models/catalog');

      tabRoutePage.findPageTitle().should('contain.text', 'Models');

      // Verify all three tabs are visible
      tabRoutePage.findTab('catalog').should('exist');
      tabRoutePage.findTab('registry').should('exist');
      tabRoutePage.findTab('deployments').should('exist');

      // Catalog tab should be active (current URL)
      tabRoutePage.findTab('catalog').should('have.attr', 'aria-selected', 'true');

      // Click Registry tab
      tabRoutePage.findTab('registry').click();
      cy.location('pathname').should('include', '/ai-hub/models/registry');
      tabRoutePage.findTab('registry').should('have.attr', 'aria-selected', 'true');
      tabRoutePage.findTab('catalog').should('have.attr', 'aria-selected', 'false');

      // Click Deployments tab
      tabRoutePage.findTab('deployments').click();
      cy.location('pathname').should('include', '/ai-hub/models/deployments');
      tabRoutePage.findTab('deployments').should('have.attr', 'aria-selected', 'true');
      tabRoutePage.findTab('registry').should('have.attr', 'aria-selected', 'false');

      // Click back to Catalog tab
      tabRoutePage.findTab('catalog').click();
      cy.location('pathname').should('include', '/ai-hub/models/catalog');
      tabRoutePage.findTab('catalog').should('have.attr', 'aria-selected', 'true');
      tabRoutePage.findTab('deployments').should('have.attr', 'aria-selected', 'false');
    });

    it('should redirect to default tab when visiting base URL', () => {
      initIntercepts();
      cy.visitWithLogin('/ai-hub/models');
      // Should redirect to first tab (catalog)
      cy.location('pathname').should('include', '/ai-hub/models/catalog');
      tabRoutePage.findPageTitle().should('contain.text', 'Models');
    });

    it('should redirect invalid tab to default tab', () => {
      initIntercepts();
      cy.visitWithLogin('/ai-hub/models/nonexistent-tab');
      // Should redirect to first tab (catalog)
      cy.location('pathname').should('include', '/ai-hub/models/catalog');
    });
  });
});
