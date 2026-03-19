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
          model_source_type: 'custom_endpoint',
          model_type: 'llm',
          endpoints: ['https://api.openai.com/v1/models/gpt-4'],
        },
        {
          model_name: 'Embedding-Model',
          model_id: 'embedding-model',
          display_name: 'Embedding Model',
          description: 'Custom endpoint embedding model',
          usecase: 'embedding',
          status: 'Stop',
          model_source_type: 'custom_endpoint',
          model_type: 'embedding',
          endpoints: ['http://embedding.cluster.local:8080'],
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
    'should display models table with different model types and sources',
    { tags: ['@GenAI', '@ModelsTab', '@AIAssets'] },
    () => {
      cy.step('Verify the models table is visible');
      modelsTabPage.findTable().should('be.visible');

      cy.step('Verify the table has 4 rows (3 AI + 1 MaaS)');
      modelsTabPage.findTableRows().should('have.length', 4);

      cy.step('Verify Internal model row');
      const internalRow = modelsTabPage.getRow('Llama 3B Internal');
      internalRow.findUseCaseCell().should('contain.text', 'text-generation');
      internalRow.findStatusCell().should('contain.text', 'Ready');
      internalRow.findEndpointCell().findByTestId('endpoint-view-button').should('exist');
      internalRow.findPlaygroundCell().should('contain.text', 'Add to playground');

      cy.step('Verify External model row');
      const externalRow = modelsTabPage.getRow('GPT-4 External');
      externalRow.findStatusCell().should('contain.text', 'Ready');
      externalRow.findEndpointCell().findByTestId('endpoint-view-button').should('exist');

      cy.step('Verify Embedding model row');
      const embeddingRow = modelsTabPage.getRow('Embedding Model');
      embeddingRow.findUseCaseCell().should('contain.text', 'embedding');
      embeddingRow.findStatusCell().should('contain.text', 'Inactive');

      cy.step('Verify MaaS model row');
      const maasRow = modelsTabPage.getRow('Llama 70B MaaS');
      maasRow.findUseCaseCell().should('contain.text', 'text-generation');
      maasRow.findStatusCell().should('contain.text', 'Ready');
      maasRow.findEndpointCell().findByTestId('endpoint-view-button').should('exist');
    },
  );

  it(
    'should filter models by name and use case',
    { tags: ['@GenAI', '@ModelsTab', '@AIAssets'] },
    () => {
      cy.step('Filter by model name');
      cy.findByTestId('models-table-toolbar')
        .findByRole('button', { name: /Filter toggle/i })
        .click();
      cy.findByRole('menuitem', { name: 'Name' }).click();
      cy.findByTestId('models-table-toolbar').findByRole('textbox').clear();
      cy.findByTestId('models-table-toolbar').findByRole('textbox').type('Llama');
      cy.findByTestId('models-table-toolbar').findByRole('textbox').type('{enter}');
      cy.contains('Active filters:').should('exist');
      cy.contains('Name: Llama').should('exist');
      modelsTabPage.getRow('Llama 3B Internal').find().should('exist');
      modelsTabPage.getRow('Llama 70B MaaS').find().should('exist');

      cy.step('Clear filters');
      cy.findByTestId('models-table-toolbar')
        .findByRole('button', { name: /Clear all filters/i })
        .click();
      modelsTabPage.findTableRows().should('have.length', 4);

      cy.step('Filter by use case');
      cy.findByTestId('models-table-toolbar')
        .findByRole('button', { name: /Filter toggle/i })
        .click();
      cy.findByRole('menuitem', { name: 'Use Case' }).click();
      cy.findByTestId('models-table-toolbar').findByRole('textbox').clear();
      cy.findByTestId('models-table-toolbar').findByRole('textbox').type('embedding');
      cy.findByTestId('models-table-toolbar').findByRole('textbox').type('{enter}');
      cy.contains('Use Case: embedding').should('exist');
      modelsTabPage.getRow('Embedding Model').find().should('exist');
    },
  );

  it(
    'should display and interact with model endpoints',
    { tags: ['@GenAI', '@ModelsTab', '@AIAssets'] },
    () => {
      cy.step('Verify endpoint view button exists');
      const internalRow = modelsTabPage.getRow('Llama 3B Internal');
      internalRow.findEndpointCell().findByTestId('endpoint-view-button').should('exist');

      cy.step('Click endpoint view button to open endpoint modal');
      internalRow.findEndpointCell().findByTestId('endpoint-view-button').click();

      cy.step('Verify endpoint modal opens with copy buttons');
      cy.findByRole('dialog', { name: 'Endpoints' }).should('exist');
      cy.findByTestId('endpoint-modal-internal-url').should('exist');
    },
  );

  it(
    'should show add to playground button for active models',
    { tags: ['@GenAI', '@ModelsTab', '@AIAssets', '@Playground'] },
    () => {
      cy.step('Verify Add to playground button for active model');
      const activeRow = modelsTabPage.getRow('Llama 3B Internal');
      activeRow
        .findPlaygroundCell()
        .findByTestId('add-to-playground-button')
        .should('exist')
        .and('not.be.disabled');

      cy.step('Verify button is disabled for inactive models');
      const inactiveRow = modelsTabPage.getRow('Embedding Model');
      inactiveRow
        .findPlaygroundCell()
        .findByTestId('add-to-playground-button')
        .should('be.disabled');
    },
  );

  it(
    'should display model information popover',
    { tags: ['@GenAI', '@ModelsTab', '@AIAssets'] },
    () => {
      cy.step('Click "Don\'t see the model you\'re looking for?" button');
      cy.findByTestId('dont-see-model-button').should('exist');
      cy.findByTestId('dont-see-model-button').click();

      cy.step('Verify popover opens with information');
      cy.findByRole('dialog', {
        name: /Information about making model deployments available/i,
      }).should('exist');

      cy.step('Verify popover content explains AI assets');
      cy.findByRole('dialog').should('contain', 'model deployments available as AI assets');

      cy.step('Close the popover');
      cy.findByTestId('model-info-popover').findByRole('button', { name: /close/i }).click();
    },
  );
});

describe('AI Assets - Models Tab (Empty State)', () => {
  beforeEach(() => {
    setupModelsTabIntercepts({
      namespace: TEST_NAMESPACE,
      aiModels: [],
      maasModels: [],
    });

    aiAssetsPage.visit(TEST_NAMESPACE);
  });

  it(
    'should display empty state when no models are available',
    { tags: ['@GenAI', '@ModelsTab', '@AIAssets', '@EmptyState'] },
    () => {
      cy.step('Verify empty state is displayed with instructional message');
      cy.findByText('To begin you must deploy a model').should('be.visible');

      cy.step('Verify models table does not exist');
      modelsTabPage.findTable().should('not.exist');

      cy.step('Verify "Go to Deployments" action button exists');
      cy.findByRole('button', { name: /Go to Deployments/i }).should('be.visible');
    },
  );
});
