import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { MODELS_AS_A_SERVICE_READY } from '@odh-dashboard/k8s-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ProjectModel } from '@odh-dashboard/internal/api/models/index';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { asProductAdminUser } from '../../../utils/mockUsers';
import {
  createExternalProviderModal,
  deleteExternalProviderModal,
  editExternalProviderModal,
  externalProvidersPage,
  pathModal,
  phaseModal,
} from '../../../pages/modelsAsAService';
import {
  mockExternalProvider,
  mockExternalProviders,
  mockMaasNamespaces,
  mockMaasSecrets,
} from '../../../utils/maasUtils';

const TEST_PROJECT = 'test-project';

const setupCommonIntercepts = () => {
  asProductAdminUser();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ modelAsService: true }));
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

const setupExternalProvidersListIntercepts = (
  providers: ReturnType<typeof mockExternalProviders> = [],
) => {
  cy.interceptOdh(
    'GET /maas/api/v1/externalmodel',
    { query: { namespace: TEST_PROJECT } },
    { data: [] },
  );
  cy.interceptOdh(
    'GET /maas/api/v1/externalprovider',
    { query: { namespace: TEST_PROJECT } },
    { data: providers },
  );
  cy.interceptOdh(
    'GET /maas/api/v1/secrets',
    { query: { namespace: TEST_PROJECT } },
    { data: mockMaasSecrets() },
  );
};

const setupExternalProvidersCreateIntercepts = () => {
  setupExternalProvidersListIntercepts([]);
  cy.interceptOdh(
    'GET /maas/api/v1/secrets',
    { query: { namespace: TEST_PROJECT } },
    { data: mockMaasSecrets() },
  );
};

describe('External providers', () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  it('should not show the external providers page when MaaS is disabled', () => {
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ modelAsService: false }));
    externalProvidersPage.visit();
    externalProvidersPage.findPage().should('not.exist');
  });

  it('should not show the external providers page when MaaS is not ready', () => {
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

  describe('list', () => {
    it('shows the empty state when no providers exist', () => {
      setupExternalProvidersListIntercepts([]);
      externalProvidersPage.visit();
      externalProvidersPage.findPage().should('exist');
      externalProvidersPage.findPageTitle().should('contain.text', 'External providers');
      externalProvidersPage.findDescription().should('exist');
      externalProvidersPage.findProjectSelector().should('exist');
      externalProvidersPage.findEmptyState().should('exist');
    });

    describe('with external providers', () => {
      beforeEach(() => {
        setupExternalProvidersListIntercepts(mockExternalProviders());
        externalProvidersPage.visit();
        externalProvidersPage.findPageTitle().should('exist');
        externalProvidersPage.findDescription().should('exist');
        externalProvidersPage.findProjectSelector().should('exist');
        externalProvidersPage.findTable().should('exist');
        externalProvidersPage.findRows().should('have.length', 5);
      });

      it('displays provider table content with status details', () => {
        const awsBedrockUsEastRow = externalProvidersPage.getRow('AWS Bedrock US East');
        awsBedrockUsEastRow.findName().should('contain.text', 'AWS Bedrock US East');
        awsBedrockUsEastRow
          .findDescription()
          .should('contain.text', 'AWS Bedrock US East provider.');
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

        const anthropicRow = externalProvidersPage.getRow('Anthropic Provider');
        anthropicRow.findName().should('contain.text', 'Anthropic Provider');
        anthropicRow.findDescription().should('contain.text', 'Anthropic provider.');
        anthropicRow.findProviderType().should('contain.text', 'Anthropic');
        anthropicRow.findAuthMechanism().should('contain.text', 'API key');
        anthropicRow.findCredentialSecretRef().should('contain.text', 'anthropic-api-key');
        anthropicRow.findPhaseLabel().should('contain.text', 'Ready');

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

      it('filters and sorts external providers', () => {
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

        externalProvidersPage.findColumnSortButton('Provider type').click();
        externalProvidersPage.findRows().eq(0).should('contain.text', 'Anthropic');
        externalProvidersPage.findRows().eq(4).should('contain.text', 'AWS Bedrock');
        externalProvidersPage.findColumnSortButton('Provider type').click();
        externalProvidersPage.findRows().eq(0).should('contain.text', 'AWS Bedrock');
        externalProvidersPage.findRows().eq(4).should('contain.text', 'Anthropic');

        externalProvidersPage.findColumnSortButton('Authentication').click();
        externalProvidersPage.findRows().eq(0).should('contain.text', 'API key');
        externalProvidersPage.findRows().eq(4).should('contain.text', 'Signature Version 4');
        externalProvidersPage.findColumnSortButton('Authentication').click();
        externalProvidersPage.findRows().eq(0).should('contain.text', 'Signature Version 4');
        externalProvidersPage.findRows().eq(4).should('contain.text', 'API key');

        externalProvidersPage.findColumnSortButton('Status').click();
        externalProvidersPage.findRows().eq(0).should('contain.text', 'Failed');
        externalProvidersPage.findRows().eq(4).should('contain.text', 'Ready');
        externalProvidersPage.findColumnSortButton('Status').click();
        externalProvidersPage.findRows().eq(0).should('contain.text', 'Ready');
        externalProvidersPage.findRows().eq(4).should('contain.text', 'Failed');

        externalProvidersPage.findFilterInput().should('have.value', '');
        externalProvidersPage.findFilterDropdownButton().click();
        externalProvidersPage.findFilterDropdownItem('name').click();
        externalProvidersPage.findFilterInput().type('AWS Bedrock US East');
        externalProvidersPage.findRows().should('have.length', 1);
        externalProvidersPage.findRows().should('contain.text', 'AWS Bedrock US East');
        externalProvidersPage.findFilterResetButton().click();

        externalProvidersPage.findFilterDropdownButton().click();
        externalProvidersPage.findFilterDropdownItem('authentication').click();
        externalProvidersPage.selectAuthenticationFilter('sigv4');
        externalProvidersPage.findRows().should('have.length', 2);
        externalProvidersPage.findRows().should('contain.text', 'Pending Anthropic Development');
        externalProvidersPage.findRows().should('contain.text', 'AWS Bedrock US East');
        externalProvidersPage.findFilterResetButton().click();

        externalProvidersPage.findFilterDropdownButton().click();
        externalProvidersPage.findFilterDropdownItem('status').click();
        externalProvidersPage.selectStatusFilter('ready');
        externalProvidersPage.findRows().should('have.length', 2);
        externalProvidersPage.findRows().should('contain.text', 'AWS Bedrock US East');
        externalProvidersPage.findRows().should('contain.text', 'Anthropic Provider');
        externalProvidersPage.findFilterResetButton().click();

        externalProvidersPage.findFilterDropdownButton().click();
        externalProvidersPage.findFilterDropdownItem('providerType').click();
        externalProvidersPage.selectProviderTypeFilter('aws-bedrock');
        externalProvidersPage.findRows().should('have.length', 2);
        externalProvidersPage.findRows().should('contain.text', 'AWS Bedrock US East');
        externalProvidersPage.findRows().should('contain.text', 'Invalid AWS Bedrock US West');

        externalProvidersPage.findFilterDropdownButton().click();
        externalProvidersPage.findFilterDropdownItem('name').click();
        externalProvidersPage.findFilterInput().type('Invalid');
        externalProvidersPage.findRows().should('have.length', 1);
        externalProvidersPage.findRows().should('contain.text', 'Invalid AWS Bedrock US West');
        externalProvidersPage.findFilterResetButton().click();

        externalProvidersPage.findFilterInput().type('abc123');
        externalProvidersPage.findEmptyFilterState().should('exist');
      });

      it('opens the create modal from the toolbar add button', () => {
        externalProvidersPage.findAddExternalProviderButton().click();
        createExternalProviderModal.shouldBeOpen();
        createExternalProviderModal.findSubmitButton().should('be.disabled');
      });

      it('deletes an external provider', () => {
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

  describe('create', () => {
    beforeEach(() => {
      setupExternalProvidersCreateIntercepts();
      externalProvidersPage.visit();
      externalProvidersPage.findPage().should('exist');
    });

    it('opens the modal from the empty state and disables submit until the form is valid', () => {
      externalProvidersPage.findEmptyState().should('exist');
      externalProvidersPage.findCreateExternalProviderButton().click();

      createExternalProviderModal.shouldBeOpen();
      createExternalProviderModal.findProjectInput().should('have.value', TEST_PROJECT);
      createExternalProviderModal.findProjectInput().should('be.disabled');
      createExternalProviderModal.findSubmitButton().should('be.disabled');

      createExternalProviderModal.fillRequiredFields({
        displayName: 'OpenAI Production',
        providerType: 'openai',
        endpoint: 'api.openai.com',
        existingSecret: 'openai-api-key',
      });

      createExternalProviderModal.findSubmitButton().should('be.enabled');
    });

    it('creates an external provider using an existing secret', () => {
      const createdProvider = mockExternalProvider({
        name: 'openai-production',
        displayName: 'OpenAI Production',
        description: 'Production OpenAI endpoint',
        endpointUrl: 'api.openai.com',
        provider: 'openai',
        credentialSecretRef: 'openai-api-key',
      });

      cy.interceptOdh('POST /maas/api/v1/externalprovider', { data: createdProvider }).as(
        'createExternalProvider',
      );
      cy.interceptOdh(
        'GET /maas/api/v1/externalprovider',
        { query: { namespace: TEST_PROJECT } },
        { data: [createdProvider] },
      ).as('listExternalProviders');

      externalProvidersPage.findCreateExternalProviderButton().click();
      createExternalProviderModal.shouldBeOpen();

      createExternalProviderModal.findDisplayNameInput().type('OpenAI Production');
      createExternalProviderModal
        .find()
        .findByTestId('external-provider-name-desc-description')
        .type('Production OpenAI endpoint');
      createExternalProviderModal.selectProviderType('openai');
      createExternalProviderModal.findEndpointInput().type('api.openai.com');
      createExternalProviderModal.selectExistingSecret('openai-api-key');
      createExternalProviderModal.selectAuthentication('apikey');
      createExternalProviderModal.findSubmitButton().click();

      cy.wait('@createExternalProvider').then((interception) => {
        expect(interception.request.body?.data).to.include({
          name: 'openai-production',
          namespace: TEST_PROJECT,
          displayName: 'OpenAI Production',
          description: 'Production OpenAI endpoint',
          endpointUrl: 'api.openai.com',
          provider: 'openai',
          authMechanism: 'apikey',
          credentialSecretRef: 'openai-api-key',
        });
      });

      cy.wait('@listExternalProviders');
      createExternalProviderModal.shouldBeOpen(false);
      externalProvidersPage.findTable().should('exist');
      externalProvidersPage.getRow('OpenAI Production').findName().should('exist');
    });

    it('creates a secret and external provider when creating a new secret', () => {
      const createdProvider = mockExternalProvider({
        name: 'openai-production',
        displayName: 'OpenAI Production',
        endpointUrl: 'api.openai.com',
        provider: 'openai',
        credentialSecretRef: 'openai-prod-key',
      });

      cy.interceptOdh('POST /maas/api/v1/secrets', {
        data: { name: 'openai-prod-key' },
      }).as('createSecret');
      cy.interceptOdh('POST /maas/api/v1/externalprovider', { data: createdProvider }).as(
        'createExternalProvider',
      );
      cy.interceptOdh(
        'GET /maas/api/v1/secrets',
        { query: { namespace: TEST_PROJECT } },
        { data: [...mockMaasSecrets(), { name: 'openai-prod-key' }] },
      );
      cy.interceptOdh(
        'GET /maas/api/v1/externalprovider',
        { query: { namespace: TEST_PROJECT } },
        { data: [createdProvider] },
      ).as('listExternalProviders');

      externalProvidersPage.findCreateExternalProviderButton().click();
      createExternalProviderModal.fillRequiredFields({
        displayName: 'OpenAI Production',
        providerType: 'openai',
        endpoint: 'api.openai.com',
        newSecret: { name: 'openai-prod-key', apiKey: 'sk-test-key' },
      });
      createExternalProviderModal.findSubmitButton().click();

      cy.wait('@createSecret').then((interception) => {
        expect(interception.request.body?.data).to.deep.equal({
          namespace: TEST_PROJECT,
          name: 'openai-prod-key',
          value: 'sk-test-key',
        });
      });
      cy.wait('@createExternalProvider');
      cy.wait('@listExternalProviders');
      createExternalProviderModal.shouldBeOpen(false);
      externalProvidersPage.getRow('OpenAI Production').findName().should('exist');
    });

    it('shows validation errors for an invalid new secret name and endpoint', () => {
      externalProvidersPage.findCreateExternalProviderButton().click();
      createExternalProviderModal.selectCreateNewSecret();
      createExternalProviderModal.findSecretNameInput().type('Invalid Secret Name');
      createExternalProviderModal
        .find()
        .contains('Secret name must be a valid Kubernetes resource name')
        .should('exist');
      createExternalProviderModal.findSubmitButton().should('be.disabled');

      createExternalProviderModal.findEndpointInput().type('https://api.openai.com');
      createExternalProviderModal.findEndpointInput().blur();
      createExternalProviderModal
        .find()
        .contains('Endpoint must be an FQDN with no scheme or path')
        .should('exist');
      createExternalProviderModal.findSubmitButton().should('be.disabled');
    });

    it('closes the modal when cancel is clicked', () => {
      externalProvidersPage.findCreateExternalProviderButton().click();
      createExternalProviderModal.shouldBeOpen();
      createExternalProviderModal.findCancelButton().click();
      createExternalProviderModal.shouldBeOpen(false);
    });
  });

  describe('edit', () => {
    const existingProvider = mockExternalProvider({
      name: 'openai-prod',
      displayName: 'OpenAI Production',
      description: 'Production OpenAI endpoint',
      endpointUrl: 'api.openai.com',
      provider: 'openai',
      credentialSecretRef: 'openai-api-key',
    });

    beforeEach(() => {
      setupExternalProvidersListIntercepts([existingProvider]);
      externalProvidersPage.visit();
      externalProvidersPage.findPage().should('exist');
    });

    it('opens the edit modal with prefilled fields', () => {
      externalProvidersPage.getRow('OpenAI Production').findKebabAction('Edit').click();

      editExternalProviderModal.shouldBeOpen();
      editExternalProviderModal.findProjectInput().should('have.value', TEST_PROJECT);
      editExternalProviderModal.findDisplayNameInput().should('have.value', 'OpenAI Production');
      editExternalProviderModal
        .find()
        .findByTestId('external-provider-name-desc-description')
        .should('have.value', 'Production OpenAI endpoint');
      editExternalProviderModal.find().contains('openai-prod').should('exist');
      editExternalProviderModal
        .find()
        .findByTestId('provider-type-toggle')
        .should('contain.text', 'OpenAI');
      editExternalProviderModal.findEndpointInput().should('have.value', 'api.openai.com');
      editExternalProviderModal.findSubmitButton().should('be.enabled');
    });

    it('updates an external provider', () => {
      const updatedProvider = mockExternalProvider({
        name: 'openai-prod',
        displayName: 'OpenAI Production Updated',
        description: 'Updated production endpoint',
        endpointUrl: 'api.updated-openai.com',
        provider: 'openai',
        credentialSecretRef: 'openai-api-key',
      });

      cy.interceptOdh(
        'PUT /maas/api/v1/externalprovider/:namespace/:name',
        { path: { namespace: TEST_PROJECT, name: 'openai-prod' } },
        { data: updatedProvider },
      ).as('updateExternalProvider');
      cy.interceptOdh(
        'GET /maas/api/v1/externalprovider',
        { query: { namespace: TEST_PROJECT } },
        { data: [updatedProvider] },
      ).as('listExternalProviders');

      externalProvidersPage.getRow('OpenAI Production').findKebabAction('Edit').click();
      editExternalProviderModal.shouldBeOpen();
      editExternalProviderModal.findDisplayNameInput().clear().type('OpenAI Production Updated');
      editExternalProviderModal
        .find()
        .findByTestId('external-provider-name-desc-description')
        .clear()
        .type('Updated production endpoint');
      editExternalProviderModal.findEndpointInput().clear().type('api.updated-openai.com');
      editExternalProviderModal.findSubmitButton().click();

      cy.wait('@updateExternalProvider').then((interception) => {
        expect(interception.request.body?.data).to.include({
          displayName: 'OpenAI Production Updated',
          description: 'Updated production endpoint',
          endpointUrl: 'api.updated-openai.com',
          authMechanism: 'apikey',
          credentialSecretRef: 'openai-api-key',
          provider: 'openai',
        });
        expect(interception.request.body?.data.config).to.deep.equal({});
      });
      cy.wait('@listExternalProviders');
      editExternalProviderModal.shouldBeOpen(false);
      externalProvidersPage.getRow('OpenAI Production Updated').findName().should('exist');
    });

    it('can switch to a different existing credential secret', () => {
      const updatedProvider = mockExternalProvider({
        name: 'openai-prod',
        displayName: 'OpenAI Production',
        description: 'Production OpenAI endpoint',
        endpointUrl: 'api.openai.com',
        provider: 'openai',
        credentialSecretRef: 'anthropic-api-key',
      });

      cy.interceptOdh(
        'PUT /maas/api/v1/externalprovider/:namespace/:name',
        { path: { namespace: TEST_PROJECT, name: 'openai-prod' } },
        { data: updatedProvider },
      ).as('updateExternalProvider');
      cy.interceptOdh(
        'GET /maas/api/v1/externalprovider',
        { query: { namespace: TEST_PROJECT } },
        { data: [updatedProvider] },
      ).as('listExternalProviders');

      externalProvidersPage.getRow('OpenAI Production').findKebabAction('Edit').click();
      editExternalProviderModal.selectExistingSecret('anthropic-api-key');
      editExternalProviderModal.findSubmitButton().click();

      cy.wait('@updateExternalProvider').then((interception) => {
        expect(interception.request.body?.data.credentialSecretRef).to.equal('anthropic-api-key');
      });
      cy.wait('@listExternalProviders');
      editExternalProviderModal.shouldBeOpen(false);
    });

    it('closes the modal without updating when cancel is clicked', () => {
      cy.interceptOdh(
        'PUT /maas/api/v1/externalprovider/:namespace/:name',
        { path: { namespace: TEST_PROJECT, name: 'openai-prod' } },
        { data: existingProvider },
      ).as('updateExternalProvider');

      externalProvidersPage.getRow('OpenAI Production').findKebabAction('Edit').click();
      editExternalProviderModal.shouldBeOpen();
      editExternalProviderModal.findEndpointInput().clear().type('api.changed.com');
      editExternalProviderModal.findCancelButton().click();
      editExternalProviderModal.shouldBeOpen(false);
      cy.get('@updateExternalProvider.all').should('have.length', 0);
    });

    it('shows a deleted credential secret in the edit modal', () => {
      const providerWithDeletedSecret = mockExternalProvider({
        name: 'openai-prod',
        displayName: 'OpenAI Production',
        description: 'Production OpenAI endpoint',
        endpointUrl: 'api.openai.com',
        provider: 'openai',
        credentialSecretRef: 'deleted-api-key',
        phase: 'Failed',
        statusMessage: 'Credential secret not found',
      });

      setupExternalProvidersListIntercepts([providerWithDeletedSecret]);
      externalProvidersPage.visit();
      externalProvidersPage.findPage().should('exist');

      externalProvidersPage.getRow('OpenAI Production').findKebabAction('Edit').click();
      editExternalProviderModal.shouldBeOpen();
      editExternalProviderModal
        .findCredentialSecretInput()
        .should('have.value', 'deleted-api-key (not found)');
      editExternalProviderModal.findMissingCredentialSecretWarning().should('exist');
      editExternalProviderModal.findSubmitButton().should('be.enabled');
    });
  });
});
