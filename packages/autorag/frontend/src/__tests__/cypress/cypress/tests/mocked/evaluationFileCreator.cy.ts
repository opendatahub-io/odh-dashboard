/* eslint-disable camelcase */
import { mockModArchResponse } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockStorageSecret, mockOGXSecret } from '~/__mocks__/mockSecretListItem';
import { mockS3ListObjectsResponse } from '~/__mocks__/mockS3ListObjectsResponse';
import { mockVectorStoreProvidersResponse } from '~/__mocks__/mockVectorStore';
import {
  evaluationFileCreator,
  evaluationFileSelector,
} from '~/__tests__/cypress/cypress/pages/evaluationFileCreator';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

const TEST_NAMESPACE = 'test-ns';

const mockOgxModelsResponse = () => ({
  models: [
    { id: 'llm-model-1', type: 'llm', provider: 'openai', resource_path: '/models/llm-1' },
    {
      id: 'embedding-model-1',
      type: 'embedding',
      provider: 'openai',
      resource_path: '/models/emb-1',
    },
  ],
});

const initIntercepts = () => {
  cy.interceptApi(
    'GET /api/:apiVersion/user',
    { path: { apiVersion: CLIENT_API_VERSION } },
    mockUserSettings({}),
  );

  cy.interceptApi('GET /api/:apiVersion/namespaces', { path: { apiVersion: CLIENT_API_VERSION } }, [
    mockNamespace({ name: TEST_NAMESPACE }),
  ]);

  // Secrets — generic catch-all first, then specific type overrides last (Cypress uses last match)
  const validStorageSecret = mockStorageSecret({
    name: 'storage-secret',
    data: {
      AWS_ACCESS_KEY_ID: '[REDACTED]',
      AWS_SECRET_ACCESS_KEY: '[REDACTED]',
      AWS_DEFAULT_REGION: '[REDACTED]',
      AWS_S3_ENDPOINT: '[REDACTED]',
      AWS_S3_BUCKET: 'test-bucket',
    },
  });
  cy.intercept(
    { method: 'GET', pathname: '/autorag/api/v1/secrets' },
    mockModArchResponse([mockOGXSecret({ name: 'ogx-secret' }), validStorageSecret]),
  );
  cy.intercept(
    { method: 'GET', pathname: '/autorag/api/v1/secrets', query: { type: 'ogx' } },
    mockModArchResponse([mockOGXSecret({ name: 'ogx-secret' })]),
  );
  cy.intercept(
    { method: 'GET', pathname: '/autorag/api/v1/secrets', query: { type: 'storage' } },
    mockModArchResponse([validStorageSecret]),
  );

  // OGX models
  cy.intercept(
    { method: 'GET', pathname: '/autorag/api/v1/ogx/models' },
    mockModArchResponse(mockOgxModelsResponse()),
  );

  // Vector stores
  cy.intercept(
    { method: 'GET', pathname: '/autorag/api/v1/ogx/vector-stores' },
    mockModArchResponse(mockVectorStoreProvidersResponse()),
  );

  // S3 files for the file explorer
  cy.intercept(
    { method: 'GET', pathname: '/autorag/api/v1/s3/files' },
    mockModArchResponse(
      mockS3ListObjectsResponse({
        common_prefixes: [{ prefix: 'documents/' }],
        contents: [
          {
            key: 'doc1.pdf',
            size: 1024,
            last_modified: '2026-01-01T00:00:00Z',
            storage_class: 'STANDARD',
          },
          {
            key: 'doc2.txt',
            size: 512,
            last_modified: '2026-01-02T00:00:00Z',
            storage_class: 'STANDARD',
          },
          {
            key: 'image.png',
            size: 2048,
            last_modified: '2026-01-03T00:00:00Z',
            storage_class: 'STANDARD',
          },
        ],
        key_count: 3,
      }),
    ),
  );

  // S3 upload
  cy.intercept(
    { method: 'POST', pathname: '/autorag/api/v1/s3/files/**' },
    { statusCode: 200, body: { uploaded: true, key: 'eval-file.json' } },
  ).as('uploadFile');

  // Connection types (used by AutoragConfigure)
  cy.intercept({ method: 'GET', pathname: '**/api/connection-types' }, { body: { items: [] } });

  // Pipeline definitions
  cy.intercept(
    { method: 'GET', pathname: '/autorag/api/v1/pipeline-definitions' },
    mockModArchResponse([]),
  );
};

const navigateToConfigure = () => {
  cy.visit(`/configure/${TEST_NAMESPACE}`);
  cy.findByTestId('autorag-name-input').should('be.visible');
};

const advanceToStep2 = () => {
  cy.findByTestId('autorag-name-input').type('Test Experiment');
  cy.findByTestId('ogx-secret-selector').click();
  cy.findByRole('option', { name: /ogx-secret/i }).click();
  cy.findByTestId('autorag-next-button').click();
  cy.findByTestId('configure-step-subtitle').should('be.visible');

  // Select S3 connection — wait for secrets to load
  cy.findByTestId('aws-secret-selector').should('exist');
  cy.findByTestId('aws-secret-selector').click();
  cy.findByTestId('aws-secret-selector').find('input').type('storage-secret');
  cy.findByRole('option', { name: /storage-secret/i })
    .should('be.visible')
    .click();

  // Select input data file so the configure details panel renders
  cy.findByTestId('browse-bucket-button').click();
  cy.findByTestId('file-explorer-table').should('be.visible');
  cy.findByTestId('file-explorer-table').contains('td', 'doc1.pdf').click();
  cy.findByTestId('file-explorer-select-btn').click();

  // Wait for the evaluation section to render
  cy.findByTestId('evaluation-create-button').should('exist');
};

const advanceToStep2WithFolder = () => {
  cy.findByTestId('autorag-name-input').type('Test Experiment');
  cy.findByTestId('ogx-secret-selector').click();
  cy.findByRole('option', { name: /ogx-secret/i }).click();
  cy.findByTestId('autorag-next-button').click();
  cy.findByTestId('configure-step-subtitle').should('be.visible');

  // Select S3 connection
  cy.findByTestId('aws-secret-selector').should('exist');
  cy.findByTestId('aws-secret-selector').click();
  cy.findByTestId('aws-secret-selector').find('input').type('storage-secret');
  cy.findByRole('option', { name: /storage-secret/i })
    .should('be.visible')
    .click();

  // Select a folder as input data (not a file)
  cy.findByTestId('browse-bucket-button').click();
  cy.findByTestId('file-explorer-table').should('be.visible');
  cy.findByTestId('file-explorer-table').contains('td', 'documents').click();
  cy.findByTestId('file-explorer-select-btn').click();

  cy.findByTestId('evaluation-create-button').should('exist');
};

// Helper: add a Q&A pair (document auto-selected from file input)
const addQAPair = (question: string, answer: string) => {
  evaluationFileCreator.findQuestionInput().type(question);
  evaluationFileCreator.findAnswerInput().type(answer);
  evaluationFileCreator.findAddButton().should('be.enabled');
  evaluationFileCreator.findAddButton().click();
};

describe('EvaluationFileCreator', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should open the modal, add a Q&A pair, and verify form state', () => {
    navigateToConfigure();
    advanceToStep2();

    evaluationFileCreator.find().should('not.exist');
    evaluationFileSelector.findCreateButton().click();

    evaluationFileCreator.find().should('be.visible');
    evaluationFileCreator.findEmptyState().should('be.visible');
    evaluationFileCreator.findAddButton().should('be.disabled');
    evaluationFileCreator.findSubmitButton().should('be.disabled');

    // Fill in question and answer (document auto-selected from input data file)
    evaluationFileCreator.findQuestionInput().type('What is machine learning?');
    evaluationFileCreator.findAnswerInput().type('A subset of artificial intelligence');
    evaluationFileCreator.findAddButton().should('be.enabled');
    evaluationFileCreator.findAddButton().click();

    // Row should appear in table, form should be cleared
    evaluationFileCreator.findTableRow('What is machine learning?').should('be.visible');
    evaluationFileCreator.findQuestionInput().should('have.value', '');
    evaluationFileCreator.findAnswerInput().should('have.value', '');

    evaluationFileCreator.findSubmitButton().should('be.enabled');
  });

  it('should edit and delete rows', () => {
    navigateToConfigure();
    advanceToStep2();

    evaluationFileSelector.findCreateButton().click();
    addQAPair('Q1', 'A1');
    evaluationFileCreator.findTableRow('Q1').should('be.visible');

    // Edit the row
    evaluationFileCreator.findKebabAction('Q1', 'Edit').click();
    evaluationFileCreator.findQuestionInput().should('have.value', 'Q1');
    evaluationFileCreator.findAnswerInput().should('have.value', 'A1');

    // Re-add the edited row
    evaluationFileCreator.findAddButton().click();
    evaluationFileCreator.findTableRow('Q1').should('be.visible');

    // Delete the row
    evaluationFileCreator.findKebabAction('Q1', 'Delete').click();
    evaluationFileCreator.findEmptyState().should('be.visible');
  });

  it('should submit the evaluation file and close the modal', () => {
    navigateToConfigure();
    advanceToStep2();

    evaluationFileSelector.findCreateButton().click();
    addQAPair('What is AI?', 'Artificial Intelligence');

    evaluationFileCreator.findSubmitButton().click();
    cy.wait('@uploadFile');

    evaluationFileCreator.find().should('not.exist');
  });

  it('should show the uploaded file in the evaluation selector and find it via S3 browse', () => {
    navigateToConfigure();
    advanceToStep2();

    evaluationFileSelector.findCreateButton().click();
    addQAPair('What is AI?', 'Artificial Intelligence');
    evaluationFileCreator.findSubmitButton().click();
    cy.wait('@uploadFile');

    evaluationFileCreator.find().should('not.exist');
    evaluationFileSelector.findFileInput().should('have.value', 'eval-file.json');

    // Clear the selection
    evaluationFileSelector.findClearButton().click();
    evaluationFileSelector.findFileInput().should('have.value', '');

    // Mock the S3 search to return the uploaded file
    cy.intercept(
      { method: 'GET', pathname: '/autorag/api/v1/s3/files', query: { search: 'eval-file' } },
      mockModArchResponse(
        mockS3ListObjectsResponse({
          common_prefixes: [],
          contents: [
            {
              key: 'eval-file.json',
              size: 256,
              last_modified: '2026-06-29T12:00:00Z',
              storage_class: 'STANDARD',
            },
          ],
          key_count: 1,
        }),
      ),
    ).as('searchS3');

    // Browse S3 and search for the uploaded file
    evaluationFileSelector.findS3BrowseButton().click();
    cy.findByTestId('file-explorer-search').type('eval-file');
    cy.wait('@searchS3');
    cy.findByTestId('file-explorer-table').contains('eval-file.json').should('be.visible');
  });

  it('should require manual document selection when input data is a folder', () => {
    navigateToConfigure();
    advanceToStep2WithFolder();

    evaluationFileSelector.findCreateButton().click();

    // With folder input, Select button should be visible
    evaluationFileCreator.findSelectDocumentsButton().should('be.visible');

    // Fill question and answer — Add should be disabled without documents
    evaluationFileCreator.findQuestionInput().type('Q1');
    evaluationFileCreator.findAnswerInput().type('A1');
    evaluationFileCreator.findAddButton().should('be.disabled');

    // Mock the sub-path request the document selector's S3FileExplorer will make
    cy.intercept(
      {
        method: 'GET',
        pathname: '/autorag/api/v1/s3/files',
        query: { path: '/documents/' },
      },
      mockModArchResponse(
        mockS3ListObjectsResponse({
          common_prefixes: [],
          contents: [
            {
              key: 'documents/doc1.pdf',
              size: 1024,
              last_modified: '2026-01-01T00:00:00Z',
              storage_class: 'STANDARD',
            },
            {
              key: 'documents/doc2.txt',
              size: 512,
              last_modified: '2026-01-02T00:00:00Z',
              storage_class: 'STANDARD',
            },
          ],
          key_count: 2,
        }),
      ),
    );

    // Select multiple documents
    evaluationFileCreator.findSelectDocumentsButton().click();

    // Wait for the document selector's file explorer to load
    cy.findAllByTestId('file-explorer-table').last().should('be.visible');
    cy.findAllByTestId('file-explorer-table')
      .last()
      .contains('td', 'doc1.pdf')
      .should('be.visible');

    // Select both documents via their row checkboxes
    cy.findAllByTestId('file-explorer-table')
      .last()
      .contains('tr', 'doc1.pdf')
      .find('input[type="checkbox"]')
      .click();
    cy.findAllByTestId('file-explorer-table')
      .last()
      .contains('tr', 'doc2.txt')
      .find('input[type="checkbox"]')
      .click();
    cy.findAllByTestId('file-explorer-select-btn').last().click();

    // Add button should now be enabled
    evaluationFileCreator.findAddButton().should('be.enabled');
    evaluationFileCreator.findAddButton().click();

    // Row should show "2 selected" for documents
    evaluationFileCreator.findEntriesTable().contains('2 selected').should('be.visible');
  });

  it('should disable submit when the form has unsaved changes', () => {
    navigateToConfigure();
    advanceToStep2();

    evaluationFileSelector.findCreateButton().click();
    addQAPair('Q1', 'A1');

    evaluationFileCreator.findSubmitButton().should('be.enabled');

    // Type something in the question field (dirty form)
    evaluationFileCreator.findQuestionInput().type('partial');
    evaluationFileCreator.findSubmitButton().should('be.disabled');
  });

  it('should close the modal without submitting on Cancel', () => {
    navigateToConfigure();
    advanceToStep2();

    evaluationFileSelector.findCreateButton().click();
    evaluationFileCreator.find().should('be.visible');

    evaluationFileCreator.findCancelButton().click();
    evaluationFileCreator.find().should('not.exist');
  });
});
