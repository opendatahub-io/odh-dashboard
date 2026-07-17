import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig.js';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus.js';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ProjectModel } from '@odh-dashboard/internal/api/models/index';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { externalModelsPage } from '../../../pages/modelsAsAService';
import { mockMaasNamespaces } from '../../../utils/maasUtils';

const TEST_PROJECT = 'test-project';

const setupCommonIntercepts = () => {
  asProductAdminUser();
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({ modelAsService: true, externalModels: true }),
  );
  cy.interceptOdh('GET /maas/api/v1/user', {
    data: { userId: 'test-user', clusterAdmin: false },
  });
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: TEST_PROJECT })]),
  );
  cy.interceptOdh('GET /maas/api/v1/namespaces', { data: mockMaasNamespaces([TEST_PROJECT]) });
  cy.interceptOdh(
    'GET /maas/api/v1/externalmodel',
    { query: { namespace: TEST_PROJECT } },
    { data: [] },
  );
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.OGX_OPERATOR]: { managementState: 'Managed' },
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
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
    externalModelsPage.findTabPageTitle().should('exist');
    externalModelsPage.findDescription().should('exist');
    externalModelsPage.findPage().should('exist');
    externalModelsPage.findProjectSelector().should('exist');
    externalModelsPage.findEmptyState().should('exist');
  });
  it('should not show the external models page when the feature flag is disabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({ modelAsService: true, externalModels: false }),
    );
    externalModelsPage.visit();
    externalModelsPage.findExternalModelsTab().should('not.exist');
    externalModelsPage.findPage().should('not.exist');
  });
  it('should not show the external models page when models as a service is disabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({ modelAsService: false, externalModels: true }),
    );
    externalModelsPage.visit();
    externalModelsPage.findExternalModelsTab().should('not.exist');
    externalModelsPage.findPage().should('not.exist');
  });
  it('should not show the external models tab when MaaS is not ready in the DSC', () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.OGX_OPERATOR]: { managementState: 'Managed' },
          [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        },
        conditions: [{ type: 'ModelsAsServiceReady', status: 'False', reason: 'NotReady' }],
      }),
    );
    externalModelsPage.visit();
    externalModelsPage.findExternalModelsTab().should('not.exist');
    externalModelsPage.findPage().should('not.exist');
  });
});
