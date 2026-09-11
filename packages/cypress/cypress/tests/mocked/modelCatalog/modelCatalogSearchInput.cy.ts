import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { modelCatalog } from '../../../pages/modelCatalog/modelCatalog';
import { setupModelCatalogIntercepts } from '../catalogHelpers';

describe('Model Catalog search input minimum width regression', () => {
  beforeEach(() => {
    asProductAdminUser();
  });

  it('Model Catalog search input should have minimum width of 400px', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableModelRegistry: false,
      }),
    );

    setupModelCatalogIntercepts();

    cy.visitWithLogin('/ai-hub/models/catalog');
    modelCatalog
      .findSearchInputContainer()
      .should('be.visible')
      .invoke('outerWidth')
      .should('be.gte', 400);
  });
});
