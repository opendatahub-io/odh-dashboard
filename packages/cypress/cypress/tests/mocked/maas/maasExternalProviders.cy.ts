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
  externalProvidersPage,
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

const setupExternalProvidersPageIntercepts = (
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

describe('External providers', () => {
  describe('list', () => {
    beforeEach(() => {
      setupCommonIntercepts();
    });

    it('shows the empty state when no providers exist', () => {
      setupExternalProvidersPageIntercepts([]);
      externalProvidersPage.visit();
      externalProvidersPage.findPage().should('exist');
      externalProvidersPage.findPageTitle().should('contain.text', 'External providers');
      externalProvidersPage.findDescription().should('exist');
      externalProvidersPage.findProjectSelector().should('exist');
      externalProvidersPage.findEmptyState().should('exist');
    });

    it('displays provider table content', () => {
      setupExternalProvidersPageIntercepts(mockExternalProviders());
      externalProvidersPage.visit();
      externalProvidersPage.findTable().should('exist');
      externalProvidersPage.findRows().should('have.length', 5);

      const anthropicRow = externalProvidersPage.getRow('Anthropic Provider');
      anthropicRow.findName().should('contain.text', 'Anthropic Provider');
      anthropicRow.findDescription().should('contain.text', 'Anthropic provider.');
      anthropicRow.findProviderType().should('contain.text', 'Anthropic');
      anthropicRow.findAuthMechanism().should('contain.text', 'API key');
      anthropicRow.findCredentialSecretRef().should('contain.text', 'anthropic-api-key');
      anthropicRow.findPhaseLabel().should('contain.text', 'Ready');

      const bedrockRow = externalProvidersPage.getRow('AWS Bedrock US East');
      bedrockRow.findProviderType().should('contain.text', 'AWS Bedrock');
      bedrockRow.findAuthMechanism().should('contain.text', 'Signature Version 4');
      bedrockRow.findPhaseLabel().should('contain.text', 'Ready');

      externalProvidersPage
        .getRow('Failed Anthropic Development')
        .findPhaseLabel()
        .should('contain.text', 'Failed');
      externalProvidersPage
        .getRow('Pending Anthropic Development')
        .findPhaseLabel()
        .should('contain.text', 'Pending');
    });

    it('filters providers by name', () => {
      setupExternalProvidersPageIntercepts(mockExternalProviders());
      externalProvidersPage.visit();
      externalProvidersPage.findRows().should('have.length', 5);

      externalProvidersPage.findFilterInput().type('Anthropic Provider');
      externalProvidersPage.findRows().should('have.length', 1);
      externalProvidersPage.getRow('Anthropic Provider').findName().should('exist');

      externalProvidersPage.findFilterResetButton().click();
      externalProvidersPage.findRows().should('have.length', 5);
    });

    it('opens the create modal from the toolbar add button', () => {
      setupExternalProvidersPageIntercepts(mockExternalProviders());
      externalProvidersPage.visit();
      externalProvidersPage.findTable().should('exist');

      externalProvidersPage.findAddExternalProviderButton().click();
      createExternalProviderModal.shouldBeOpen();
      createExternalProviderModal.findSubmitButton().should('be.disabled');
    });
  });

  describe('create', () => {
    beforeEach(() => {
      setupCommonIntercepts();
      setupExternalProvidersPageIntercepts([]);
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

  describe('delete', () => {
    beforeEach(() => {
      setupCommonIntercepts();
      setupExternalProvidersPageIntercepts(mockExternalProviders());
      externalProvidersPage.visit();
      externalProvidersPage.findTable().should('exist');
    });

    it('deletes an external provider', () => {
      cy.interceptOdh(
        'DELETE /maas/api/v1/externalprovider/:namespace/:name',
        { path: { namespace: TEST_PROJECT, name: 'anthropic-dev' } },
        { data: null },
      ).as('deleteExternalProvider');

      externalProvidersPage.getRow('Anthropic Provider').findKebabAction('Delete').click();
      deleteExternalProviderModal.shouldShowResourceName('Anthropic Provider');
      deleteExternalProviderModal.findInput().type('Anthropic Provider');
      deleteExternalProviderModal.findSubmitButton().should('be.enabled');

      cy.interceptOdh(
        'GET /maas/api/v1/externalprovider',
        { query: { namespace: TEST_PROJECT } },
        {
          data: mockExternalProviders().filter((provider) => provider.name !== 'anthropic-dev'),
        },
      ).as('listExternalProviders');

      deleteExternalProviderModal.findSubmitButton().click();
      cy.wait('@deleteExternalProvider');
      cy.wait('@listExternalProviders');
      externalProvidersPage.findRows().should('have.length', 4);
      externalProvidersPage.findTable().should('not.contain', 'Anthropic Provider');
    });
  });
});
