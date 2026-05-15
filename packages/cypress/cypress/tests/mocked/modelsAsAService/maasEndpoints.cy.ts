import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import {
  createEndpointsPage,
  editEndpointsPage,
  endpointsPage,
} from '../../../pages/modelsAsAService';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { modelServingGlobal } from '../../../pages/modelServing';

const setupEndpointsCommon = () => {
  asProductAdminUser();
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({ modelAsService: true, maasAuthPolicies: true, maasEndpoints: true }),
  );
  cy.interceptOdh('GET /maas/api/v1/user', {
    data: { userId: 'test-user', clusterAdmin: false },
  });
  cy.interceptOdh('GET /maas/api/v1/namespaces', { data: [] });
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.LLAMA_STACK_OPERATOR]: { managementState: 'Managed' },
      },
      conditions: [{ type: 'ModelsAsServiceReady', status: 'True', reason: 'Ready' }],
    }),
  );
};

describe('MaaS Endpoints', () => {
  beforeEach(() => {
    setupEndpointsCommon();
    modelServingGlobal.visit();
  });
  it('should show the endpoints tab when the feature flag is enabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({ modelAsService: true, maasEndpoints: true }),
    );
    modelServingGlobal.findTab('maas-endpoints').should('exist').click();
    endpointsPage.findTitle().should('contain.text', 'Endpoints');
  });

  it('should not show the endpoints tab when the feature flag is disabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({ modelAsService: true, maasEndpoints: false }),
    );
    modelServingGlobal.visit();
    modelServingGlobal.findTab('maas-endpoints').should('not.exist');
  });

  // Edit/delete this in the create ticket, just testing page navigation for now
  it('should show the create endpoint page when we visit the create endpoint page', () => {
    cy.visit('/ai-hub/models/maas-endpoints/create');
    createEndpointsPage.findTitle().should('contain.text', 'Create Endpoint');
    cy.url().should('include', '/ai-hub/models/maas-endpoints/create');
  });

  // Edit/delete this in the edit ticket, just testing page navigation for now
  it('should show the edit endpoint page when we visit the edit endpoint page', () => {
    cy.visit('/ai-hub/models/maas-endpoints/edit/test-endpoint');
    editEndpointsPage.findTitle().should('contain.text', 'Edit Endpoint');
    cy.url().should('include', '/ai-hub/models/maas-endpoints/edit/test-endpoint');
  });
});
