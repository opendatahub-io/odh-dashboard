/* eslint-disable camelcase */
import { aiAssetsPage } from '~/__tests__/cypress/cypress/pages/aiAssetsPage';
import { endpointModalPage, modelsTabPage } from '~/__tests__/cypress/cypress/pages/modelsTabPage';
import { setupModelsTabIntercepts } from '~/__tests__/cypress/cypress/support/helpers/modelsTab/modelsTabTestHelpers';

const TEST_NAMESPACE = 'test-namespace';

const MAAS_MODEL = {
  model_id: 'granite-3-8b-instruct',
  model_name: 'Granite 3.1 8B Instruct',
  display_name: 'Granite 3.1 8B Instruct',
  description: 'Granite family of LLMs',
  usecase: 'Text Generation',
  model_type: 'llm' as const,
  endpoints: ['external:https://granite-model.apps.cluster.com'],
  status: 'Running',
  serving_runtime: 'MaaS',
  api_protocol: 'OpenAI',
  version: '',
  model_source_type: 'maas' as const,
  subscriptions: [
    {
      name: 'limited',
      displayName: 'Limited',
      description: 'Lightweight access limited to smaller models.',
    },
    {
      name: 'standard',
      displayName: 'Standard',
    },
  ],
};

describe('Endpoint Detail Modal - MaaS connection details', () => {
  it(
    'should show the Base URL, Model ID, and a usage example',
    { tags: ['@GenAI', '@EndpointModal', '@AIAssets'] },
    () => {
      setupModelsTabIntercepts({
        namespace: TEST_NAMESPACE,
        aiModels: [],
        maasModels: [MAAS_MODEL],
      });
      aiAssetsPage.visit(TEST_NAMESPACE);

      modelsTabPage.openEndpointModal('Granite 3.1 8B Instruct');

      endpointModalPage.findModal().should('exist');
      cy.contains('Base URL').should('exist');
      cy.findByDisplayValue('https://granite-model.apps.cluster.com').should('exist');
      cy.contains('Use this base URL for requests to MaaS models.').should('exist');
      cy.contains('Model ID').should('exist');
      cy.findByDisplayValue('granite-3-8b-instruct').should('exist');
      cy.contains('Use this exact identifier in the model field of your API request.').should(
        'exist',
      );
      cy.contains('Authentication').should('exist');
      endpointModalPage
        .findAuthenticationCopy()
        .should(
          'have.text',
          "To authenticate requests to this model, use an existing API key or create a new one from a subscription's details page. The API key must be scoped to a subscription that includes this model.",
        );
      endpointModalPage.findSubscriptionsToggle().should('have.attr', 'aria-expanded', 'false');
      endpointModalPage.findSubscriptionsToggle().click();
      endpointModalPage.findSubscriptionsTable().should('exist');
      endpointModalPage
        .findSubscriptionLink('limited')
        .should('have.attr', 'href', '/maas/keys-and-subs/subscriptions/limited');
      cy.contains('Lightweight access limited to smaller models.').should('exist');
      endpointModalPage
        .findSubscriptionLink('standard')
        .should('have.attr', 'href', '/maas/keys-and-subs/subscriptions/standard');
      endpointModalPage.findSubscriptionsTable().within(() => {
        cy.contains('tr', 'Standard').find('td[data-label="Description"]').should('have.text', '-');
      });
      cy.contains('Usage example').should('exist');
      cy.contains('export API_KEY="<your-api-key>"').should('exist');
      cy.contains('Authorization: Bearer $API_KEY').should('exist');
      cy.contains('Set API_KEY to an existing API key').should('exist');
      cy.contains('X-MAAS-SUBSCRIPTION').should('not.exist');
    },
  );
});
