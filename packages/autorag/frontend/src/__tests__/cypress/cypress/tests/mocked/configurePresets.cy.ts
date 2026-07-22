/* eslint-disable camelcase */
import { mockModArchResponse } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockStorageSecret, mockOGXSecret } from '~/__mocks__/mockSecretListItem';
import { mockS3ListObjectsResponse } from '~/__mocks__/mockS3ListObjectsResponse';
import { mockVectorStoreProvidersResponse } from '~/__mocks__/mockVectorStore';
import { autoragConfigurePage } from '~/__tests__/cypress/cypress/pages/autoragConfigure';
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

  cy.intercept(
    { method: 'GET', pathname: '/autorag/api/v1/ogx/models' },
    mockModArchResponse(mockOgxModelsResponse()),
  );

  cy.intercept(
    { method: 'GET', pathname: '/autorag/api/v1/ogx/vector-stores' },
    mockModArchResponse(mockVectorStoreProvidersResponse()),
  );

  cy.intercept(
    { method: 'GET', pathname: '/autorag/api/v1/s3/files' },
    mockModArchResponse(
      mockS3ListObjectsResponse({
        common_prefixes: [],
        contents: [
          {
            key: 'doc1.pdf',
            size: 1024,
            last_modified: '2026-01-01T00:00:00Z',
            storage_class: 'STANDARD',
          },
        ],
        key_count: 1,
      }),
    ),
  );

  cy.intercept({ method: 'GET', pathname: '**/api/connection-types' }, { body: { items: [] } });

  cy.intercept(
    { method: 'GET', pathname: '/autorag/api/v1/pipeline-definitions' },
    mockModArchResponse([]),
  );

  cy.intercept(
    { method: 'POST', pathname: '/autorag/api/v1/pipeline-runs' },
    mockModArchResponse({ run_id: 'mock-run-id' }),
  ).as('createPipelineRun');
};

const navigateToConfigureDetails = () => {
  autoragConfigurePage.visit(TEST_NAMESPACE);

  // Step 1: Fill experiment name and OGX secret
  autoragConfigurePage.findNameInput().type('Preset Test');
  autoragConfigurePage.findOgxSecretSelector().click();
  cy.findByRole('option', { name: /ogx-secret/i }).click();
  autoragConfigurePage.findNextButton().click();
  autoragConfigurePage.findConfigureDetailsSubtitle().should('be.visible');

  // Step 2: Select S3 connection and input data file
  autoragConfigurePage.findAwsSecretSelector().should('exist');
  autoragConfigurePage.findAwsSecretSelector().click();
  autoragConfigurePage.findAwsSecretSelector().find('input').type('storage-secret');
  cy.findByRole('option', { name: /storage-secret/i })
    .should('be.visible')
    .click();

  autoragConfigurePage.findBrowseBucketButton().click();
  cy.findByTestId('file-explorer-table').should('be.visible');
  cy.findByTestId('file-explorer-table').contains('td', 'doc1.pdf').click();
  cy.findByTestId('file-explorer-select-btn').click();

  // Wait for configure details panel to render with presets
  autoragConfigurePage.findPresetRadio('speed').should('exist');
};

describe('AutoRAG Configure Presets', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should render preset radio buttons with Faster selected by default', () => {
    navigateToConfigureDetails();

    autoragConfigurePage.findPresetRadio('speed').should('be.visible');
    autoragConfigurePage.findPresetRadio('balanced').should('be.visible');

    autoragConfigurePage.findPresetRadio('speed').should('be.checked');
    autoragConfigurePage.findPresetRadio('balanced').should('not.be.checked');
  });

  it('should display human-readable labels and switch presets', () => {
    navigateToConfigureDetails();

    cy.contains('Faster').should('be.visible');
    cy.contains('Better quality').should('be.visible');

    // Switch to Better quality
    autoragConfigurePage.findPresetRadio('balanced').click();

    autoragConfigurePage.findPresetRadio('balanced').should('be.checked');
    autoragConfigurePage.findPresetRadio('speed').should('not.be.checked');

    // Switch back to Faster
    autoragConfigurePage.findPresetRadio('speed').click();

    autoragConfigurePage.findPresetRadio('speed').should('be.checked');
    autoragConfigurePage.findPresetRadio('balanced').should('not.be.checked');
  });

  it('should display preset descriptions', () => {
    navigateToConfigureDetails();

    cy.contains('4 vCPU, 16 GiB').should('exist');
    cy.contains('8 vCPU, 32 GiB').should('exist');
  });
});
