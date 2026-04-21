/* eslint-disable camelcase */
import { aiAssetsPage } from '~/__tests__/cypress/cypress/pages/aiAssetsPage';
import { modelsTabPage, endpointModalPage } from '~/__tests__/cypress/cypress/pages/modelsTabPage';
import {
  setupModelsTabIntercepts,
  setupTokenIntercept,
} from '~/__tests__/cypress/cypress/support/helpers/modelsTab/modelsTabTestHelpers';

const TEST_NAMESPACE = 'test-namespace';

const MAAS_MODEL_WITH_SUBS = {
  id: 'granite-3-8b-instruct',
  display_name: 'Granite 3.1 8B Instruct',
  description: 'Granite family of LLMs',
  usecase: 'Text Generation',
  model_type: 'llm' as const,
  url: 'https://granite-model.apps.cluster.com',
  subscriptions: [
    { name: 'premium-team-sub', displayName: 'Premium Tier' },
    { name: 'basic-team-sub', displayName: 'Basic Tier' },
  ],
};

const MAAS_MODEL_NO_SUBS = {
  id: 'llama-3-8b',
  display_name: 'Llama 3 8B',
  description: 'Llama family of LLMs',
  usecase: 'Text Generation',
  model_type: 'llm' as const,
  url: 'https://llama-model.apps.cluster.com',
  subscriptions: [],
};

describe('Endpoint Detail Modal - Subscriptions', () => {
  it(
    'should display no subscriptions alert when model has no subscriptions',
    { tags: ['@GenAI', '@EndpointModal', '@AIAssets'] },
    () => {
      setupModelsTabIntercepts({
        namespace: TEST_NAMESPACE,
        aiModels: [],
        maasModels: [MAAS_MODEL_NO_SUBS],
      });
      aiAssetsPage.visit(TEST_NAMESPACE);

      modelsTabPage.openEndpointModal('Llama 3 8B');

      endpointModalPage.findModal().should('exist');
      cy.contains('Authentication').should('not.exist');
      endpointModalPage.findSubscriptionSelect().should('not.exist');
      endpointModalPage.findGenerateButton().should('not.exist');

      cy.contains('No subscriptions available').should('exist');
      cy.contains(
        "You don't have any subscriptions for this model. Contact your administrator to request access.",
      ).should('exist');
    },
  );

  it(
    'should show subscription dropdown with correct options',
    { tags: ['@GenAI', '@EndpointModal', '@AIAssets'] },
    () => {
      setupModelsTabIntercepts({
        namespace: TEST_NAMESPACE,
        aiModels: [],
        maasModels: [MAAS_MODEL_WITH_SUBS],
      });
      aiAssetsPage.visit(TEST_NAMESPACE);

      modelsTabPage.openEndpointModal('Granite 3.1 8B Instruct');

      endpointModalPage.findSubscriptionSelect().should('contain', 'Premium Tier');

      endpointModalPage.findSubscriptionSelect().click();
      cy.contains('Premium Tier').should('exist');
      cy.contains('Basic Tier').should('exist');
      cy.contains('Basic Tier').click();

      endpointModalPage.findSubscriptionSelect().should('contain', 'Basic Tier');
    },
  );

  it(
    'should handle API key generation error',
    { tags: ['@GenAI', '@EndpointModal', '@AIAssets'] },
    () => {
      setupModelsTabIntercepts({
        namespace: TEST_NAMESPACE,
        aiModels: [],
        maasModels: [MAAS_MODEL_WITH_SUBS],
      });
      setupTokenIntercept({
        statusCode: 500,
        body: { error: { message: 'Failed to generate token' } },
      });
      aiAssetsPage.visit(TEST_NAMESPACE);

      modelsTabPage.openEndpointModal('Granite 3.1 8B Instruct');

      endpointModalPage.findSubscriptionSelect().click();
      cy.contains('Premium Tier').click();
      endpointModalPage.findGenerateButton().click();

      cy.contains('Error generating API key').should('exist');
      endpointModalPage.findApiKeyInput().should('not.exist');
      endpointModalPage.findGenerateButton().should('exist');
    },
  );

  it(
    'should disable generate button while loading',
    { tags: ['@GenAI', '@EndpointModal', '@AIAssets'] },
    () => {
      setupModelsTabIntercepts({
        namespace: TEST_NAMESPACE,
        aiModels: [],
        maasModels: [MAAS_MODEL_WITH_SUBS],
      });
      setupTokenIntercept({
        delay: 1000,
        body: {
          data: {
            key: 'test-ephemeral-token-12345',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
        },
      });
      aiAssetsPage.visit(TEST_NAMESPACE);

      modelsTabPage.openEndpointModal('Granite 3.1 8B Instruct');

      endpointModalPage.findSubscriptionSelect().click();
      cy.contains('Premium Tier').click();
      endpointModalPage.findGenerateButton().click();

      endpointModalPage.findGenerateButton().should('be.disabled');

      cy.findByTestId('endpoint-modal-api-key-input', { timeout: 2000 }).should('exist');
    },
  );

  it(
    'should reset state when modal is closed and reopened',
    { tags: ['@GenAI', '@EndpointModal', '@AIAssets'] },
    () => {
      setupModelsTabIntercepts({
        namespace: TEST_NAMESPACE,
        aiModels: [],
        maasModels: [MAAS_MODEL_WITH_SUBS],
      });
      setupTokenIntercept({
        data: {
          key: 'test-ephemeral-token-12345',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
      });
      aiAssetsPage.visit(TEST_NAMESPACE);

      modelsTabPage.openEndpointModal('Granite 3.1 8B Instruct');

      endpointModalPage.findSubscriptionSelect().click();
      cy.contains('Premium Tier').click();
      endpointModalPage.findGenerateButton().click();

      endpointModalPage.findApiKeyInput().should('exist');
      endpointModalPage.findApiKeyToggle().click();
      endpointModalPage.findApiKeyInput().should('have.attr', 'type', 'text');

      endpointModalPage.findCloseButton().click();

      modelsTabPage.openEndpointModal('Granite 3.1 8B Instruct');

      endpointModalPage.findApiKeyInput().should('not.exist');
      endpointModalPage.findGenerateButton().should('exist');
      endpointModalPage.findSubscriptionSelect().should('contain', 'Premium Tier');
    },
  );

  it(
    'should pass selected subscription to token generation',
    { tags: ['@GenAI', '@EndpointModal', '@AIAssets'] },
    () => {
      setupModelsTabIntercepts({
        namespace: TEST_NAMESPACE,
        aiModels: [],
        maasModels: [MAAS_MODEL_WITH_SUBS],
      });
      cy.interceptGenAi('POST /api/v1/maas/tokens', {
        data: {
          key: 'test-token-for-basic',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
      }).as('generateToken');
      aiAssetsPage.visit(TEST_NAMESPACE);

      modelsTabPage.openEndpointModal('Granite 3.1 8B Instruct');

      endpointModalPage.findSubscriptionSelect().click();
      cy.contains('Basic Tier').click();
      endpointModalPage.findGenerateButton().click();

      cy.wait('@generateToken').then((interception) => {
        expect(interception.request.body).to.have.property('subscription', 'basic-team-sub');
      });

      endpointModalPage.findApiKeyInput().should('exist');
    },
  );
});
