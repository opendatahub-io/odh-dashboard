/* eslint-disable camelcase */
import { aiAssetsPage } from '~/__tests__/cypress/cypress/pages/aiAssetsPage';
import { modelsTabPage } from '~/__tests__/cypress/cypress/pages/modelsTabPage';
import { setupModelsTabIntercepts } from '~/__tests__/cypress/cypress/support/helpers/modelsTab/modelsTabTestHelpers';

const TEST_NAMESPACE = 'test-namespace';

const AI_MODELS = [
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
];

const MAAS_MODELS = [
  {
    id: 'maas-llama-70b',
    display_name: 'Llama 70B MaaS',
    description: 'Llama 70B via Models as a Service',
    usecase: 'text-generation',
    ready: true,
    url: 'https://maas.example.com/v1/models/llama-70b',
    model_type: 'llm',
  },
];

describe('AI Assets - Models Tab', () => {
  beforeEach(() => {
    setupModelsTabIntercepts({
      namespace: TEST_NAMESPACE,
      aiModels: AI_MODELS,
      maasModels: MAAS_MODELS,
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
    'should filter models by name, keyword, and use case',
    { tags: ['@GenAI', '@ModelsTab', '@AIAssets'] },
    () => {
      cy.step('Filter by model name');
      cy.findByTestId('models-table-toolbar')
        .findByRole('button', { name: /Filter toggle/i })
        .click();
      cy.findByRole('menuitem', { name: 'Name' }).click();
      cy.findByTestId('models-table-toolbar').findByRole('searchbox').clear();
      cy.findByTestId('models-table-toolbar').findByRole('searchbox').type('Llama');
      cy.findByTestId('models-table-toolbar').findByRole('searchbox').type('{enter}');
      cy.findByTestId('filter-chip-name').should('exist');
      modelsTabPage.getRow('Llama 3B Internal').find().should('exist');
      modelsTabPage.getRow('Llama 70B MaaS').find().should('exist');

      cy.step('Clear filters');
      cy.findByTestId('models-table-toolbar')
        .findByRole('button', { name: /Clear all filters/i })
        .click();
      modelsTabPage.findTableRows().should('have.length', 4);

      cy.step('Filter by keyword');
      cy.findByTestId('models-table-toolbar')
        .findByRole('button', { name: /Filter toggle/i })
        .click();
      cy.findByRole('menuitem', { name: 'Keyword' }).click();
      cy.findByTestId('models-table-toolbar').findByRole('searchbox').clear();
      cy.findByTestId('models-table-toolbar').findByRole('searchbox').type('External');
      cy.findByTestId('models-table-toolbar').findByRole('searchbox').type('{enter}');
      cy.findByTestId('filter-chip-keyword').should('exist');
      modelsTabPage.getRow('GPT-4 External').find().should('exist');

      cy.step('Clear filters');
      cy.findByTestId('models-table-toolbar')
        .findByRole('button', { name: /Clear all filters/i })
        .click();

      cy.step('Filter by use case');
      cy.findByTestId('models-table-toolbar')
        .findByRole('button', { name: /Filter toggle/i })
        .click();
      cy.findByRole('menuitem', { name: 'Use case' }).click();
      cy.findByTestId('models-table-toolbar').findByRole('searchbox').clear();
      cy.findByTestId('models-table-toolbar').findByRole('searchbox').type('embedding');
      cy.findByTestId('models-table-toolbar').findByRole('searchbox').type('{enter}');
      cy.findByTestId('filter-chip-useCase').should('exist');
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

      cy.step('Click endpoint view button to show endpoint details');
      internalRow.findEndpointCell().findByTestId('endpoint-view-button').click();

      cy.step('Verify copy endpoint button exists');
      internalRow.findEndpointCell().findByTestId('copy-endpoint-button').should('exist');
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
      cy.findByRole('dialog').should(
        'contain',
        'model deployments that are available as AI assets',
      );

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
    'should display empty state with instructions',
    { tags: ['@GenAI', '@ModelsTab', '@AIAssets', '@EmptyState'] },
    () => {
      cy.step('Verify empty state is visible');
      cy.findByTestId('empty-state').should('exist').and('be.visible');

      cy.step('Verify empty state message');
      cy.findByTestId('empty-state-message').should('contain', 'Model Deployments');
      cy.findByTestId('empty-state-message').should(
        'contain',
        'Make this deployment available as an AI asset',
      );

      cy.step('Verify "Go to Deployments" button exists');
      cy.findByTestId('empty-state-action-button').should('exist').and('be.visible');
    },
  );
});

describe('AI Assets - Models Tab (MaaS disabled)', () => {
  beforeEach(() => {
    setupModelsTabIntercepts({
      namespace: TEST_NAMESPACE,
      aiModels: AI_MODELS,
      maasModels: MAAS_MODELS,
    });
  });

  it(
    'should only show AI models when modelAsService flag is disabled',
    { tags: ['@GenAI', '@ModelsTab', '@AIAssets', '@FeatureFlag'] },
    () => {
      cy.step('Visit with modelAsService feature flag disabled');
      aiAssetsPage.visit(TEST_NAMESPACE, { modelAsService: 'false' });

      cy.step('Verify the table shows only AI models (no MaaS)');
      modelsTabPage.findTable().should('be.visible');
      modelsTabPage.findTableRows().should('have.length', 3);

      cy.step('Verify MaaS model is not present');
      modelsTabPage.findTable().should('not.contain.text', 'Llama 70B MaaS');

      cy.step('Verify AI models are still present');
      modelsTabPage.findTable().should('contain.text', 'Llama 3B Internal');
      modelsTabPage.findTable().should('contain.text', 'GPT-4 External');
      modelsTabPage.findTable().should('contain.text', 'Embedding Model');

      cy.step('Verify no warning alert is shown');
      modelsTabPage.findWarningAlert().should('not.exist');
    },
  );
});

describe('AI Assets - Models Tab (MaaS error)', () => {
  beforeEach(() => {
    setupModelsTabIntercepts({
      namespace: TEST_NAMESPACE,
      aiModels: AI_MODELS,
      maasError: true,
    });

    aiAssetsPage.visit(TEST_NAMESPACE);
  });

  it(
    'should show warning alert when MaaS models fail to load',
    { tags: ['@GenAI', '@ModelsTab', '@AIAssets'] },
    () => {
      cy.step('Verify warning alert is displayed');
      modelsTabPage.findWarningAlert().should('be.visible');
      modelsTabPage
        .findWarningAlert()
        .should('contain.text', 'Models as a Service could not be loaded');

      cy.step('Verify AI models still display');
      modelsTabPage.findTable().should('be.visible');
      modelsTabPage.findTableRows().should('have.length', 3);
    },
  );

  it(
    'should allow dismissing the warning alert',
    { tags: ['@GenAI', '@ModelsTab', '@AIAssets'] },
    () => {
      cy.step('Verify warning alert is displayed');
      modelsTabPage.findWarningAlert().should('be.visible');

      cy.step('Click the close button on the alert');
      modelsTabPage.findWarningAlert().find('button[aria-label*="Close"]').click();

      cy.step('Verify the alert is dismissed');
      modelsTabPage.findWarningAlert().should('not.exist');

      cy.step('Verify models table is still visible');
      modelsTabPage.findTable().should('be.visible');
      modelsTabPage.findTableRows().should('have.length', 3);
    },
  );
});
