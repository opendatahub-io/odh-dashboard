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
      cy.contains('To authenticate requests to this model, use an existing API key').should(
        'exist',
      );
      cy.findByRole('link', { name: 'API keys' }).should('have.attr', 'href', '/maas/tokens');
      cy.findByRole('button', { name: 'View subscriptions' }).should(
        'have.attr',
        'aria-expanded',
        'false',
      );
      cy.findByRole('button', { name: 'View subscriptions' }).click();
      cy.findByTestId('endpoint-modal-subscriptions-table').should('exist');
      cy.findByRole('link', { name: 'Limited' }).should(
        'have.attr',
        'href',
        '/maas/maas-governance/subscriptions/view/limited',
      );
      cy.contains('Lightweight access limited to smaller models.').should('exist');
      cy.findByRole('link', { name: 'Standard' }).should(
        'have.attr',
        'href',
        '/maas/maas-governance/subscriptions/view/standard',
      );
      cy.findByTestId('endpoint-modal-subscriptions-table').within(() => {
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
