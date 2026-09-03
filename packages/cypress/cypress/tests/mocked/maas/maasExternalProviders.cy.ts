import { ProjectModel } from '@odh-dashboard/internal/api/models/index';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { MODELS_AS_A_SERVICE_READY } from '@odh-dashboard/k8s-core';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockExternalProviders, mockMaasNamespaces } from '../../../utils/maasUtils';
import {
  externalProvidersPage,
  deleteExternalProviderModal,
  phaseModal,
  pathModal,
} from '../../../pages/modelsAsAService';
import { asProductAdminUser } from '../../../utils/mockUsers';

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
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.OGX_OPERATOR]: { managementState: 'Managed' },
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
      conditions: [{ type: MODELS_AS_A_SERVICE_READY, status: 'True', reason: 'Ready' }],
    }),
  );
};

describe('External Providers Page', () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });
  it('should not show the external providers page when the external modelsfeature flag is disabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({ modelAsService: true, externalModels: false }),
    );
    externalProvidersPage.visit();
    externalProvidersPage.findPage().should('not.exist');
  });

  it('should not show the external providers page when MaaS is disabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({ modelAsService: false, externalModels: true }),
    );
    externalProvidersPage.visit();
    externalProvidersPage.findPage().should('not.exist');
  });

  it('should not show the external providers page when the MaaS is not ready', () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.OGX_OPERATOR]: { managementState: 'Managed' },
          [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        },
        conditions: [{ type: MODELS_AS_A_SERVICE_READY, status: 'False', reason: 'NotReady' }],
      }),
    );
    externalProvidersPage.visit();
    externalProvidersPage.findPage().should('not.exist');
  });

  it('should show the empty external providers page when there are no external providers', () => {
    cy.interceptOdh(
      'GET /maas/api/v1/externalprovider',
      { query: { namespace: TEST_PROJECT } },
      { data: [] },
    );
    externalProvidersPage.visit();
    externalProvidersPage.findPageTitle().should('exist');
    externalProvidersPage.findDescription().should('exist');
    externalProvidersPage.findProjectSelector().should('exist');
    externalProvidersPage.findEmptyState().should('exist');
  });

  describe('with external providers', () => {
    beforeEach(() => {
      cy.interceptOdh(
        'GET /maas/api/v1/externalprovider',
        { query: { namespace: TEST_PROJECT } },
        { data: mockExternalProviders() },
      );
      externalProvidersPage.visit();
      externalProvidersPage.findPageTitle().should('exist');
      externalProvidersPage.findDescription().should('exist');
      externalProvidersPage.findProjectSelector().should('exist');
      externalProvidersPage.findTable().should('exist');
      externalProvidersPage.findRows().should('have.length', 5);
    });

    it('should display table rows with correct content', () => {
      const awsBedrockUsEastRow = externalProvidersPage.getRow('AWS Bedrock US East');
      awsBedrockUsEastRow.findName().should('contain.text', 'AWS Bedrock US East');
      awsBedrockUsEastRow.findDescription().should('contain.text', 'AWS Bedrock US East provider.');
      awsBedrockUsEastRow.findProviderType().should('contain.text', 'AWS Bedrock');
      awsBedrockUsEastRow.findPhaseLabel().should('contain.text', 'Ready');
      awsBedrockUsEastRow.findStatusSubtext().should('not.exist');
      awsBedrockUsEastRow
        .findCredentialSecretRef()
        .should('contain.text', 'bedrock-credentials-us-east');
      awsBedrockUsEastRow.findAuthMechanism().should('contain.text', 'Signature Version 4');
      awsBedrockUsEastRow.findEndpointUrlLink('bedrock-us-east').should('exist').click();
      pathModal.findInputValue().should('have.value', 'bedrock.us-east-1.amazonaws.com');
      pathModal.findSubContent().should('contain.text', 'Signature Version 4');
      pathModal.findCloseButton().click();

      // Verify the status modal content
      const invalidRow = externalProvidersPage.getRow('Invalid AWS Bedrock US West');
      invalidRow.findStatusSubtext().should('exist');
      invalidRow.findPhaseLabel().should('contain.text', 'Invalid').click();
      phaseModal.find().should('exist');
      phaseModal.findAlert().should('exist');
      phaseModal.findAlertBody().should('exist');
      phaseModal.findApiDetailsButton().should('exist').click();
      phaseModal.findAlertDetailsCodeBlock().should('exist');
      phaseModal.findCloseButton().click();
      phaseModal.shouldBeOpen(false);

      const pendingRow = externalProvidersPage.getRow('Pending Anthropic Development');
      pendingRow.findStatusSubtext().should('exist');
      pendingRow.findPhaseLabel().should('contain.text', 'Pending').click();
      phaseModal.find().should('exist');
      phaseModal.findAlert().should('exist');
      phaseModal.findAlertBody().should('exist');
      phaseModal.findCloseButton().click();
      phaseModal.shouldBeOpen(false);

      const failedRow = externalProvidersPage.getRow('Failed Anthropic Development');
      failedRow.findStatusSubtext().should('exist');
      failedRow.findPhaseLabel().should('contain.text', 'Failed').click();
      phaseModal.find().should('exist');
      phaseModal.findAlert().should('exist');
      phaseModal.findAlertBody().should('exist');
      phaseModal.findApiDetailsButton().should('exist').click();
      phaseModal.findAlertDetailsCodeBlock().should('exist');
      phaseModal.findCloseButton().click();
      phaseModal.shouldBeOpen(false);
    });

    it('should filter and sort the external providers', () => {
      // Sort by name
      externalProvidersPage.findRows().eq(0).should('contain.text', 'Anthropic Provider');
      externalProvidersPage.findColumnSortButton('External provider').click();
      externalProvidersPage
        .findRows()
        .eq(0)
        .should('contain.text', 'Pending Anthropic Development');
      externalProvidersPage.findRows().eq(4).should('contain.text', 'Anthropic Provider');
      externalProvidersPage.findColumnSortButton('External provider').click();
      externalProvidersPage.findRows().eq(0).should('contain.text', 'Anthropic Provider');
      externalProvidersPage
        .findRows()
        .eq(4)
        .should('contain.text', 'Pending Anthropic Development');

      // Sort by provider type
      externalProvidersPage.findColumnSortButton('Provider type').click();
      externalProvidersPage.findRows().eq(0).should('contain.text', 'Anthropic');
      externalProvidersPage.findRows().eq(4).should('contain.text', 'AWS Bedrock');
      externalProvidersPage.findColumnSortButton('Provider type').click();
      externalProvidersPage.findRows().eq(0).should('contain.text', 'AWS Bedrock');
      externalProvidersPage.findRows().eq(4).should('contain.text', 'Anthropic');

      // Sort by auth mechanism
      externalProvidersPage.findColumnSortButton('Authentication').click();
      externalProvidersPage.findRows().eq(0).should('contain.text', 'API key');
      externalProvidersPage.findRows().eq(4).should('contain.text', 'Signature Version 4');
      externalProvidersPage.findColumnSortButton('Authentication').click();
      externalProvidersPage.findRows().eq(0).should('contain.text', 'Signature Version 4');
      externalProvidersPage.findRows().eq(4).should('contain.text', 'API key');

      // Sort by status
      externalProvidersPage.findColumnSortButton('Status').click();
      externalProvidersPage.findRows().eq(0).should('contain.text', 'Failed');
      externalProvidersPage.findRows().eq(4).should('contain.text', 'Ready');
      externalProvidersPage.findColumnSortButton('Status').click();
      externalProvidersPage.findRows().eq(0).should('contain.text', 'Ready');
      externalProvidersPage.findRows().eq(4).should('contain.text', 'Failed');

      // Filter by name
      externalProvidersPage.findFilterInput().should('have.value', '');
      externalProvidersPage.findFilterDropdownButton().click();
      externalProvidersPage.findFilterDropdownItem('name').click();
      externalProvidersPage.findFilterInput().type('AWS Bedrock US East');
      externalProvidersPage.findRows().should('have.length', 1);
      externalProvidersPage.findRows().should('contain.text', 'AWS Bedrock US East');
      externalProvidersPage.findFilterResetButton().click();

      // Filter by auth mechanism
      externalProvidersPage.findFilterDropdownButton().click();
      externalProvidersPage.findFilterDropdownItem('authentication').click();
      externalProvidersPage.selectAuthenticationFilter('sigv4');
      externalProvidersPage.findRows().should('have.length', 2);
      externalProvidersPage.findRows().should('contain.text', 'Pending Anthropic Development');
      externalProvidersPage.findRows().should('contain.text', 'AWS Bedrock US East');
      externalProvidersPage.findFilterResetButton().click();

      // Filter by phase
      externalProvidersPage.findFilterDropdownButton().click();
      externalProvidersPage.findFilterDropdownItem('status').click();
      externalProvidersPage.selectStatusFilter('ready');
      externalProvidersPage.findRows().should('have.length', 2);
      externalProvidersPage.findRows().should('contain.text', 'AWS Bedrock US East');
      externalProvidersPage.findRows().should('contain.text', 'Anthropic Provider');
      externalProvidersPage.findFilterResetButton().click();

      // Filter by provider type
      externalProvidersPage.findFilterDropdownButton().click();
      externalProvidersPage.findFilterDropdownItem('providerType').click();
      externalProvidersPage.selectProviderTypeFilter('aws-bedrock');
      externalProvidersPage.findRows().should('have.length', 2);
      externalProvidersPage.findRows().should('contain.text', 'AWS Bedrock US East');
      externalProvidersPage.findRows().should('contain.text', 'Invalid AWS Bedrock US West');

      // Stack filters (provider and name) ^ didn't clear the provider filter
      externalProvidersPage.findFilterDropdownButton().click();
      externalProvidersPage.findFilterDropdownItem('name').click();
      externalProvidersPage.findFilterInput().type('Invalid');
      externalProvidersPage.findRows().should('have.length', 1);
      externalProvidersPage.findRows().should('contain.text', 'Invalid AWS Bedrock US West');
      externalProvidersPage.findFilterResetButton().click();

      // Show empty filter state
      externalProvidersPage.findFilterInput().type('abc123');
      externalProvidersPage.findEmptyFilterState().should('exist');
    });

    it('should delete an external provider', () => {
      cy.interceptOdh(
        'DELETE /maas/api/v1/externalprovider/:namespace/:name',
        { path: { namespace: TEST_PROJECT, name: 'bedrock-us-east' } },
        { data: null },
      ).as('deleteExternalProvider');

      externalProvidersPage.getRow('AWS Bedrock US East').findKebabAction('Delete').click();
      deleteExternalProviderModal.shouldShowResourceName('AWS Bedrock US East');
      deleteExternalProviderModal.findInput().type('AWS Bedrock US East');
      deleteExternalProviderModal.findSubmitButton().should('be.enabled');

      cy.interceptOdh(
        'GET /maas/api/v1/externalprovider',
        { query: { namespace: TEST_PROJECT } },
        {
          data: mockExternalProviders().filter((provider) => provider.name !== 'bedrock-us-east'),
        },
      ).as('listExternalProviders');

      deleteExternalProviderModal.findSubmitButton().click();
      cy.wait('@deleteExternalProvider');
      cy.wait('@listExternalProviders');
      externalProvidersPage.findRows().should('have.length', 4);
      externalProvidersPage.findTable().should('not.contain', 'AWS Bedrock US East');
    });
  });
});
