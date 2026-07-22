/* eslint-disable camelcase */
import { mockModArchResponse } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockStorageSecret } from '~/__mocks__/mockSecretListItem';
import { mockS3ListObjectsResponse } from '~/__mocks__/mockS3ListObjectsResponse';
import { mockColumnSchema } from '~/__mocks__/mockColumnSchema';
import { automlConfigurePage } from '~/__tests__/cypress/cypress/pages/automlConfigure';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

const TEST_NAMESPACE = 'test-ns';

const MOCK_COLUMNS = [
  mockColumnSchema({
    name: 'approval_status',
    type: 'string',
    task_type: 'binary',
    unique_count: 2,
  }),
  mockColumnSchema({
    name: 'credit_score',
    type: 'integer',
    task_type: 'regression',
    unique_count: 3,
  }),
];

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
    { method: 'GET', pathname: '/automl/api/v1/secrets' },
    mockModArchResponse([validStorageSecret]),
  );
  cy.intercept(
    { method: 'GET', pathname: '/automl/api/v1/secrets', query: { type: 's3' } },
    mockModArchResponse([validStorageSecret]),
  );

  cy.intercept(
    { method: 'GET', pathname: '/automl/api/v1/s3/files' },
    mockModArchResponse(
      mockS3ListObjectsResponse({
        common_prefixes: [],
        contents: [
          {
            key: 'training.csv',
            size: 1024,
            last_modified: '2026-01-01T00:00:00Z',
            storage_class: 'STANDARD',
          },
        ],
        key_count: 1,
      }),
    ),
  );

  // S3 file schema — returns column definitions for target column selection
  cy.intercept(
    { method: 'GET', pathname: '/automl/api/v1/s3/files/*', query: { view: 'schema' } },
    { body: { data: { columns: MOCK_COLUMNS } } },
  );

  cy.intercept({ method: 'GET', pathname: '**/api/connection-types' }, { body: { items: [] } });
};

const navigateToConfigureDetails = () => {
  automlConfigurePage.visit(TEST_NAMESPACE);

  // Step 1: Fill experiment name
  automlConfigurePage.findNameInput().type('Preset Test');
  automlConfigurePage.findNextButton().click();
  automlConfigurePage.findConfigureStepSubtitle().should('be.visible');

  // Step 2: Select S3 connection and training data file
  automlConfigurePage.findAwsSecretSelector().should('exist');
  automlConfigurePage.findAwsSecretSelector().click();
  automlConfigurePage.findAwsSecretSelector().find('input').type('storage-secret');
  automlConfigurePage
    .selectDropdownOption(/storage-secret/i)
    .should('be.visible')
    .click();

  automlConfigurePage.findBrowseBucketButton().click();
  automlConfigurePage.findFileExplorerTable().should('be.visible');
  automlConfigurePage.findFileExplorerTable().contains('td', 'training.csv').click();
  automlConfigurePage.findFileExplorerSelectButton().click();

  // Select target column — this auto-detects prediction type (binary for approval_status)
  automlConfigurePage.findTargetColumnSelect().should('be.visible');
  automlConfigurePage.findTargetColumnSelect().click();
  automlConfigurePage.selectDropdownOption(/approval_status/i).click();

  // Wait for preset radio buttons to appear
  automlConfigurePage.findPresetRadio('speed').should('exist');
};

describe('AutoML Configure Presets', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should render preset radio buttons with Faster selected by default', () => {
    navigateToConfigureDetails();

    automlConfigurePage.findPresetRadio('speed').should('be.visible');
    automlConfigurePage.findPresetRadio('balanced').should('be.visible');

    automlConfigurePage.findPresetRadio('speed').should('be.checked');
    automlConfigurePage.findPresetRadio('balanced').should('not.be.checked');
  });

  it('should display human-readable labels and switch presets', () => {
    navigateToConfigureDetails();

    cy.contains('Faster').should('be.visible');
    cy.contains('Better quality').should('be.visible');

    // Switch to Better quality
    automlConfigurePage.findPresetRadio('balanced').click();

    automlConfigurePage.findPresetRadio('balanced').should('be.checked');
    automlConfigurePage.findPresetRadio('speed').should('not.be.checked');

    // Switch back to Faster
    automlConfigurePage.findPresetRadio('speed').click();

    automlConfigurePage.findPresetRadio('speed').should('be.checked');
    automlConfigurePage.findPresetRadio('balanced').should('not.be.checked');
  });

  it('should display preset descriptions', () => {
    navigateToConfigureDetails();

    cy.contains('4 vCPU / 16 GiB').should('exist');
    cy.contains('8 vCPU / 32 GiB').should('exist');
  });
});
