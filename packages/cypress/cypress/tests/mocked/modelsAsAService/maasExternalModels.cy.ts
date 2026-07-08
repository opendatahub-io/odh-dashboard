import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig.js';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus.js';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { externalModelsPage } from '../../../pages/modelsAsAService';
import { asProductAdminUser } from '../../../utils/mockUsers';

const setupCommonIntercepts = () => {
  asProductAdminUser();
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({ modelAsService: true, externalModels: true }),
  );
  cy.interceptOdh('GET /maas/api/v1/user', {
    data: { userId: 'test-user', clusterAdmin: false },
  });
  cy.interceptOdh('GET /maas/api/v1/namespaces', { data: [] });
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.OGX_OPERATOR]: { managementState: 'Managed' },
      },
      conditions: [{ type: 'ModelsAsServiceReady', status: 'True', reason: 'Ready' }],
    }),
  );
};

describe('External Models Page', () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });
  it('should show the external models page', () => {
    externalModelsPage.visit();
    externalModelsPage.findExternalModelsTab().should('exist');
    externalModelsPage.findTitle().should('exist');
    externalModelsPage.findDescription().should('exist');
  });
  it('should not show the external models page when the feature flag is disabled', () => {
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ modelAsService: true }));
    externalModelsPage.visit();
    externalModelsPage.findExternalModelsTab().should('not.exist');
    externalModelsPage.findTitle().should('not.exist');
    externalModelsPage.findDescription().should('not.exist');
  });
});
