/* eslint-disable camelcase */
import { aiAssetsPage } from '~/__tests__/cypress/cypress/pages/aiAssetsPage';
import { modelsTabPage } from '~/__tests__/cypress/cypress/pages/modelsTabPage';
import { setupModelsTabIntercepts } from '~/__tests__/cypress/cypress/support/helpers/modelsTab/modelsTabTestHelpers';

const TEST_NAMESPACE = 'test-namespace';

describe('AI Assets - Models Tab', () => {
  beforeEach(() => {
    setupModelsTabIntercepts({
      namespace: TEST_NAMESPACE,
      aiModels: [
        {
          model_name: 'Llama-3B-Internal',
          model_id: 'llama-3b-internal',
          display_name: 'Llama 3B Internal',
          description: 'Locally deployed Llama model',
          usecase: 'text-generation',
          status: 'Running',
          model_source_type: 'namespace',
          model_type: 'llm',
          endpoints: ['internal: http://llama-3b.test-namespace.svc.cluster.local:8080'],
        },
        {
          model_name: 'GPT-4-External',
          model_id: 'gpt-4-external',
          display_name: 'GPT-4 External',
          description: 'External GPT-4 model',
          usecase: 'text-generation',
          status: 'Running',
          model_source_type: 'external_provider',
          model_type: 'llm',
          endpoints: ['external: https://api.openai.com/v1/models/gpt-4'],
        },
        {
          model_name: 'Embedding-Model',
          model_id: 'embedding-model',
          display_name: 'Embedding Model',
          description: 'Text embedding model via public route',
          usecase: 'embedding',
          status: 'Stop',
          model_source_type: 'external_cluster',
          model_type: 'embedding',
          endpoints: ['internal: http://embedding.cluster.local:8080'],
        },
      ],
      maasModels: [
        {
          id: 'maas-llama-70b',
          display_name: 'Llama 70B MaaS',
          description: 'Llama 70B via Models as a Service',
          usecase: 'text-generation',
          ready: true,
          url: 'https://maas.example.com/v1/models/llama-70b',
          model_type: 'llm',
        },
      ],
    });

    aiAssetsPage.visit(TEST_NAMESPACE);
  });

  it(
    'should display the models table with correct columns and data',
    { tags: ['@GenAI', '@ModelsTab', '@AIAssets'] },
    () => {
      cy.step('Verify the models table is visible');
      modelsTabPage.findTable().should('be.visible');

      cy.step('Verify the table has 4 rows (3 AI + 1 MaaS)');
      modelsTabPage.findTableRows().should('have.length', 4);

      cy.step('Verify Internal model row');
      const internalRow = modelsTabPage.getRow('Llama 3B Internal');
      internalRow.findSourceLabel().should('contain.text', 'Internal');
      internalRow.findModelTypeCell().should('contain.text', 'Inferencing');
      internalRow.findUseCaseCell().should('contain.text', 'text-generation');
      internalRow.findStatusCell().should('contain.text', 'Active');
      internalRow.findEndpointCell().findByTestId('endpoint-view-button').should('exist');
      internalRow.findPlaygroundCell().should('contain.text', 'Add to playground');

      cy.step('Verify External model row');
      const externalRow = modelsTabPage.getRow('GPT-4 External');
      externalRow.findSourceLabel().should('contain.text', 'External');
      externalRow.findModelTypeCell().should('contain.text', 'Inferencing');
      externalRow.findStatusCell().should('contain.text', 'Active');
      externalRow.findEndpointCell().findByTestId('endpoint-view-button').should('exist');

      cy.step('Verify Public route / Embedding model row');
      const embeddingRow = modelsTabPage.getRow('Embedding Model');
      embeddingRow.findSourceLabel().should('contain.text', 'Public route');
      embeddingRow.findModelTypeCell().should('contain.text', 'Embedding');
      embeddingRow.findUseCaseCell().should('contain.text', 'embedding');
      embeddingRow.findStatusCell().should('contain.text', 'Inactive');

      cy.step('Verify MaaS model row');
      const maasRow = modelsTabPage.getRow('Llama 70B MaaS');
      maasRow.findSourceLabel().should('contain.text', 'MaaS');
      maasRow.findModelTypeCell().should('contain.text', 'Inferencing');
      maasRow.findUseCaseCell().should('contain.text', 'text-generation');
      maasRow.findStatusCell().should('contain.text', 'Active');
      maasRow.findEndpointCell().findByTestId('endpoint-view-button').should('exist');
    },
  );
});
