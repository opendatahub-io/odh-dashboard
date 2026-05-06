/* eslint-disable camelcase */
import { aiAssetsPage } from '~/__tests__/cypress/cypress/pages/aiAssetsPage';
import {
  modelsTabPage,
  deleteModelModal,
  kebabMenu,
} from '~/__tests__/cypress/cypress/pages/modelsTabPage';
import { setupModelsTabIntercepts } from '~/__tests__/cypress/cypress/support/helpers/modelsTab/modelsTabTestHelpers';
import { mockAAModel } from '~/__tests__/cypress/cypress/__mocks__/mockAAModels';

const TEST_NAMESPACE = 'test-namespace';

const CUSTOM_ENDPOINT_MODEL = mockAAModel({
  model_name: 'Custom-GPT-Endpoint',
  model_id: 'custom-gpt-endpoint',
  display_name: 'Custom GPT Endpoint',
  description: 'Custom endpoint for GPT model',
  usecase: 'text-generation',
  status: 'Running',
  model_source_type: 'custom_endpoint',
  model_type: 'llm',
  endpoints: ['https://custom.endpoint.com/v1/models/gpt'],
});

const NAMESPACE_MODEL = mockAAModel({
  model_name: 'Llama-3B-Internal',
  model_id: 'llama-3b-internal',
  display_name: 'Llama 3B Internal',
  description: 'Locally deployed Llama model',
  usecase: 'text-generation',
  status: 'Running',
  model_source_type: 'namespace',
  model_type: 'llm',
  endpoints: ['internal: http://llama-3b.test-namespace.svc.cluster.local:8080'],
});

const CUSTOM_EMBEDDING_MODEL = mockAAModel({
  model_name: 'Custom-Embedding',
  model_id: 'custom-embedding',
  display_name: 'Custom Embedding Model',
  description: 'Custom endpoint embedding model',
  usecase: 'embedding',
  status: 'Running',
  model_source_type: 'custom_endpoint',
  model_type: 'embedding',
  endpoints: ['https://custom.endpoint.com/v1/embeddings'],
});

describe('AI Assets - Model Tab - Kebab Menu Actions', () => {
  beforeEach(() => {
    setupModelsTabIntercepts({
      namespace: TEST_NAMESPACE,
      aiModels: [CUSTOM_ENDPOINT_MODEL, NAMESPACE_MODEL, CUSTOM_EMBEDDING_MODEL],
      maasModels: [],
    });

    aiAssetsPage.visit(TEST_NAMESPACE);
  });

  it(
    'should show kebab menu for custom endpoint models, open/close it, and have proper aria-label',
    { tags: ['@GenAI', '@ModelsTab'] },
    () => {
      cy.step('Verify custom endpoint model has kebab menu with aria-label');
      const customRow = modelsTabPage.getRow('Custom GPT Endpoint');
      customRow.findKebabMenu().should('exist');
      customRow
        .findKebabMenu()
        .should('have.attr', 'aria-label')
        .and('include', 'Custom GPT Endpoint');

      cy.step('Verify namespace model does not have kebab menu');
      modelsTabPage.getRow('Llama 3B Internal').findKebabMenu().should('not.exist');

      cy.step('Open kebab menu and verify contents');
      customRow.findKebabMenu().click();
      kebabMenu.shouldBeVisible();
      kebabMenu.findRemoveAssetItem().should('be.visible');

      cy.step('Close menu by clicking outside');
      modelsTabPage.findTable().click('topLeft');
      kebabMenu.shouldNotExist();
    },
  );
});

describe('AI Assets - Model Tab - Remove Asset Action', () => {
  beforeEach(() => {
    setupModelsTabIntercepts({
      namespace: TEST_NAMESPACE,
      aiModels: [CUSTOM_ENDPOINT_MODEL, NAMESPACE_MODEL],
      maasModels: [],
    });

    aiAssetsPage.visit(TEST_NAMESPACE);
  });

  it(
    'should open delete modal, allow cancel, and remove asset when confirmed',
    { tags: ['@GenAI', '@ModelsTab'] },
    () => {
      cy.step('Open kebab menu and click Remove asset');
      modelsTabPage.getRow('Custom GPT Endpoint').findKebabMenu().click();
      kebabMenu.findRemoveAssetItem().click();

      cy.step('Verify delete modal contents');
      deleteModelModal.shouldBeVisible();
      deleteModelModal.findTitle().should('be.visible');
      deleteModelModal.find().should('contain.text', 'Custom GPT Endpoint');
      deleteModelModal.findRemoveButton().should('be.visible');
      deleteModelModal.findCancelButton().should('be.visible');

      cy.step('Click Cancel and verify modal closes');
      deleteModelModal.findCancelButton().click();
      deleteModelModal.shouldNotExist();
      modelsTabPage.getRow('Custom GPT Endpoint').find().should('exist');

      cy.step('Reopen and confirm removal');
      cy.interceptGenAi('DELETE /api/v1/models/external', { success: true }).as('deleteModel');
      modelsTabPage.getRow('Custom GPT Endpoint').findKebabMenu().click();
      kebabMenu.findRemoveAssetItem().click();

      cy.interceptGenAi('GET /api/v1/aaa/models', { data: [NAMESPACE_MODEL] }).as('refreshModels');
      deleteModelModal.findRemoveButton().click();

      cy.wait('@deleteModel');
      cy.wait('@refreshModels');
      modelsTabPage.findTable().should('not.contain.text', 'Custom GPT Endpoint');
      modelsTabPage.getRow('Llama 3B Internal').find().should('exist');
    },
  );

  it('should display loading state while deleting', { tags: ['@GenAI', '@ModelsTab'] }, () => {
    cy.step('Intercept delete request with delay');
    cy.interceptGenAi('DELETE /api/v1/models/external', {
      statusCode: 200,
      body: { success: true },
      delay: 1000,
    }).as('deleteModel');

    cy.step('Open delete modal and click Remove');
    modelsTabPage.getRow('Custom GPT Endpoint').findKebabMenu().click();
    kebabMenu.findRemoveAssetItem().click();
    deleteModelModal.findRemoveButton().click();

    cy.step('Verify loading state');
    deleteModelModal.findRemovingButton().should('be.visible').and('be.disabled');
    deleteModelModal.findCancelButton().should('be.disabled');

    cy.step('Wait for deletion to complete');
    cy.wait('@deleteModel');
  });

  it('should display error on failure and allow retry', { tags: ['@GenAI', '@ModelsTab'] }, () => {
    cy.step('Intercept delete request with error');
    cy.interceptGenAi('DELETE /api/v1/models/external', {
      statusCode: 500,
      body: { error: { message: 'Internal server error' } },
    }).as('deleteModelError');

    cy.step('Open delete modal and confirm');
    modelsTabPage.getRow('Custom GPT Endpoint').findKebabMenu().click();
    kebabMenu.findRemoveAssetItem().click();
    deleteModelModal.shouldBeVisible();
    deleteModelModal.findRemoveButton().click();

    cy.step('Wait for error response');
    cy.wait('@deleteModelError');

    cy.step('Verify error alert is displayed');
    deleteModelModal
      .findDangerAlert()
      .should('be.visible')
      .and('contain.text', 'Internal server error');

    cy.step('Verify modal remains open with Remove re-enabled');
    deleteModelModal.shouldBeVisible();
    deleteModelModal.findRemoveButton().should('be.enabled');

    cy.step('Intercept retry with success and set up refresh');
    cy.interceptGenAi('DELETE /api/v1/models/external', { success: true }).as('deleteModelSuccess');
    cy.interceptGenAi('GET /api/v1/aaa/models', { data: [NAMESPACE_MODEL] }).as('refreshModels');

    cy.step('Click Remove button again to retry');
    deleteModelModal.findRemoveButton().click();

    cy.step('Verify successful deletion');
    cy.wait('@deleteModelSuccess');
    cy.wait('@refreshModels');
    modelsTabPage.findTable().should('not.contain.text', 'Custom GPT Endpoint');
  });
});

describe('AI Assets - Model Tab - Multiple Custom Endpoint Models', () => {
  const CUSTOM_MODEL_1 = mockAAModel({
    model_name: 'Custom-Model-1',
    model_id: 'custom-model-1',
    display_name: 'Custom Model 1',
    description: 'First custom model',
    usecase: 'text-generation',
    status: 'Running',
    model_source_type: 'custom_endpoint',
    model_type: 'llm',
    endpoints: ['https://custom1.endpoint.com/v1/models'],
  });

  const CUSTOM_MODEL_2 = mockAAModel({
    model_name: 'Custom-Model-2',
    model_id: 'custom-model-2',
    display_name: 'Custom Model 2',
    description: 'Second custom model',
    usecase: 'text-generation',
    status: 'Running',
    model_source_type: 'custom_endpoint',
    model_type: 'llm',
    endpoints: ['https://custom2.endpoint.com/v1/models'],
  });

  beforeEach(() => {
    setupModelsTabIntercepts({
      namespace: TEST_NAMESPACE,
      aiModels: [CUSTOM_MODEL_1, CUSTOM_MODEL_2, NAMESPACE_MODEL],
      maasModels: [],
    });

    aiAssetsPage.visit(TEST_NAMESPACE);
  });

  it(
    'should show independent kebab menus and delete only the selected model',
    {
      tags: ['@GenAI', '@ModelsTab'],
    },
    () => {
      cy.step('Verify both custom models have kebab menus');
      modelsTabPage.getRow('Custom Model 1').findKebabMenu().should('exist');
      modelsTabPage.getRow('Custom Model 2').findKebabMenu().should('exist');

      cy.step('Open first model kebab menu');
      modelsTabPage.getRow('Custom Model 1').findKebabMenu().click();
      kebabMenu.shouldBeVisible();

      cy.step('Click outside to close first menu');
      modelsTabPage.findTable().click('topLeft');

      cy.step('Open second model kebab menu');
      modelsTabPage.getRow('Custom Model 2').findKebabMenu().click();
      kebabMenu.shouldBeVisible();
      kebabMenu.findRemoveAssetItem().should('be.visible');

      cy.step('Close menu and delete Custom Model 1');
      modelsTabPage.findTable().click('topLeft');
      cy.interceptGenAi('DELETE /api/v1/models/external', { success: true }).as('deleteModel1');

      modelsTabPage.getRow('Custom Model 1').findKebabMenu().click();
      kebabMenu.findRemoveAssetItem().click();

      cy.interceptGenAi('GET /api/v1/aaa/models', { data: [CUSTOM_MODEL_2, NAMESPACE_MODEL] }).as(
        'refreshModels',
      );

      deleteModelModal.findRemoveButton().click();

      cy.wait('@deleteModel1').then((interception) => {
        expect(interception.request.url).to.include('model_id=custom-model-1');
      });
      cy.wait('@refreshModels');

      cy.step('Verify Custom Model 1 is removed');
      modelsTabPage.findTable().should('not.contain.text', 'Custom Model 1');

      cy.step('Verify Custom Model 2 and namespace model still exist');
      modelsTabPage.getRow('Custom Model 2').find().should('exist');
      modelsTabPage.getRow('Llama 3B Internal').find().should('exist');
    },
  );
});

describe('AI Assets - Model Tab - Embedding Model Actions', () => {
  beforeEach(() => {
    setupModelsTabIntercepts({
      namespace: TEST_NAMESPACE,
      aiModels: [CUSTOM_EMBEDDING_MODEL, CUSTOM_ENDPOINT_MODEL],
      maasModels: [],
    });

    aiAssetsPage.visit(TEST_NAMESPACE);
  });

  it(
    'should allow deleting custom endpoint embedding models',
    {
      tags: ['@GenAI', '@ModelsTab'],
    },
    () => {
      cy.step('Verify embedding model has kebab menu');
      modelsTabPage.getRow('Custom Embedding Model').findKebabMenu().should('exist');

      cy.step('Intercept delete request');
      cy.interceptGenAi('DELETE /api/v1/models/external', { success: true }).as('deleteEmbedding');

      cy.step('Delete embedding model');
      modelsTabPage.getRow('Custom Embedding Model').findKebabMenu().click();
      kebabMenu.findRemoveAssetItem().click();

      cy.step('Set up refresh intercept after modal opens');
      cy.interceptGenAi('GET /api/v1/aaa/models', { data: [CUSTOM_ENDPOINT_MODEL] }).as(
        'refreshModels',
      );

      deleteModelModal.findRemoveButton().click();

      cy.step('Verify deletion');
      cy.wait('@deleteEmbedding');
      cy.wait('@refreshModels');
      modelsTabPage.findTable().should('not.contain.text', 'Custom Embedding Model');
    },
  );
});

describe('AI Assets - Model Tab - Accessibility', () => {
  beforeEach(() => {
    setupModelsTabIntercepts({
      namespace: TEST_NAMESPACE,
      aiModels: [CUSTOM_ENDPOINT_MODEL],
      maasModels: [],
    });

    aiAssetsPage.visit(TEST_NAMESPACE);
  });

  it(
    'should be keyboard accessible with proper ARIA attributes',
    { tags: ['@GenAI', '@ModelsTab', '@A11y'] },
    () => {
      cy.step('Verify kebab toggle has correct aria-label');
      modelsTabPage
        .getRow('Custom GPT Endpoint')
        .findKebabMenu()
        .should('have.attr', 'aria-label', 'Actions for Custom GPT Endpoint');

      cy.step('Verify kebab toggle is focusable');
      modelsTabPage.getRow('Custom GPT Endpoint').findKebabMenu().focus().should('be.focused');

      cy.step('Open menu via click and verify menu roles');
      modelsTabPage.getRow('Custom GPT Endpoint').findKebabMenu().click();
      kebabMenu.shouldBeVisible();
      kebabMenu.findRemoveAssetItem().should('exist');

      cy.step('Close menu and verify toggle updates aria-expanded');
      modelsTabPage.findTable().click('topLeft');
      kebabMenu.shouldNotExist();
      modelsTabPage
        .getRow('Custom GPT Endpoint')
        .findKebabMenu()
        .should('have.attr', 'aria-expanded', 'false');

      cy.step('Reopen menu to verify repeated interaction');
      modelsTabPage.getRow('Custom GPT Endpoint').findKebabMenu().click();
      kebabMenu.shouldBeVisible();
      kebabMenu.findRemoveAssetItem().should('exist');
    },
  );
});
