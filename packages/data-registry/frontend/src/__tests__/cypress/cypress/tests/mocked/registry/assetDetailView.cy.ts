/* eslint-disable camelcase */
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

const REGISTRY_API = '/data-registry/api/v1';

const mockTableResponse = {
  name: 'claims-data',
  asset_type: 'table',
  uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  format: 'parquet',
  location: 's3://bucket/claims',
  content_type: undefined,
  columns: [
    { name: 'id', type: 'integer', nullable: false, description: 'Primary key' },
    { name: 'claim_amount', type: 'decimal', nullable: true, description: 'Amount' },
    { name: 'status', type: 'string', nullable: false },
  ],
  collection: 'analytics',
  connection_ref: { type: 'rhai', secret_name: 'my-s3-connection' },
  owner: 'data-team',
  description: 'Claims processing data',
  labels: ['production', 'claims', 'analytics'],
  properties: { 'data.quality': 'verified', source: 'etl-pipeline' },
  registered_by: 'user@example.com',
  updated_by: 'admin@example.com',
  created_at: '2026-07-15T10:30:00Z',
  updated_at: '2026-08-20T14:45:00Z',
};

const mockVolumeResponse = {
  name: 'training-documents',
  'catalog-name': 'test-project',
  'schema-name': 'default',
  'volume-type': 'documents',
  'storage-location': 's3://bucket/docs/training',
  comment: null,
  owner: null,
  'created-at': '2026-06-01T08:00:00Z',
  'updated-at': '2026-08-10T12:00:00Z',
  labels: ['source-docs', 'unstructured'],
  properties: {
    description: 'Training document storage',
    'content-type': 'application/pdf',
    purpose: 'training',
    environment: 'production',
    registered_by: 'ml-team@example.com',
    updated_by: 'admin@example.com',
  },
  config: {},
};

const initIntercepts = () => {
  cy.interceptApi(
    'GET /api/:apiVersion/user',
    { path: { apiVersion: CLIENT_API_VERSION } },
    mockUserSettings({ userId: 'test-user' }),
  );
  cy.interceptApi('GET /api/:apiVersion/namespaces', { path: { apiVersion: CLIENT_API_VERSION } }, [
    mockNamespace({ name: 'test-project' }),
  ]);
};

describe('Table Detail View', () => {
  beforeEach(() => {
    initIntercepts();
    cy.intercept(
      'GET',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: mockTableResponse },
    ).as('getTable');
  });

  it('should display table metadata in two-column layout', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.findByTestId('data-details-card').should('exist');
    cy.findByTestId('asset-description').should('contain.text', 'Claims processing data');
    cy.findByTestId('asset-format').should('contain.text', 'parquet');
    cy.findByTestId('asset-collection').should('contain.text', 'analytics');
    cy.findByTestId('asset-type').should('contain.text', 'Structured');
    cy.findByTestId('asset-location').should('contain.text', 's3://bucket/claims');
    cy.findByTestId('asset-owner').should('contain.text', 'data-team');
    cy.findByTestId('connection-ref-label').should('contain.text', 'my-s3-connection');
  });

  it('should display asset type badge and Overview tab', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.findByTestId('asset-type-badge').should('contain.text', 'Data asset');
    cy.findByTestId('detail-tabs').should('exist');
    cy.contains('Overview').should('exist');
  });

  it('should display labels, properties, and schema cards', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.findByTestId('labels-card').should('exist');
    cy.contains('production').should('exist');
    cy.contains('claims').should('exist');

    cy.findByTestId('properties-card').should('exist');
    cy.contains('data.quality: verified').should('exist');
    cy.contains('source: etl-pipeline').should('exist');

    cy.findByTestId('schema-card').should('exist');
    cy.findByTestId('schema-column-count').should('contain.text', '3 columns');
    cy.findByTestId('schema-columns-table').should('exist');
    cy.findByTestId('schema-column-name-id').should('contain.text', 'id');
  });

  it('should display created and modified with user attribution', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.findByTestId('asset-created-at').should('contain.text', 'by user@example.com');
    cy.findByTestId('asset-updated-at').should('contain.text', 'by admin@example.com');
  });

  it('should show breadcrumb navigation', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.get('.pf-v6-c-breadcrumb').should('exist');
    cy.contains('Data').should('exist');
    cy.contains('analytics').should('exist');
    cy.contains('claims-data').should('exist');
  });

  it('should open delete modal from kebab menu', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-delete').click();
    cy.findByTestId('delete-asset-modal').should('exist');
    cy.contains('Permanently delete "claims-data" structured asset?').should('exist');
  });

  it('should delete a table and return to the data browse view', () => {
    cy.intercept(
      'DELETE',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { statusCode: 204 },
    ).as('deleteTable');

    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');
    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-delete').click();
    cy.findByTestId('delete-asset-confirmation').type('claims-data');
    cy.findByTestId('delete-asset-confirm').click();
    cy.wait('@deleteTable');
    cy.url().should('include', '/ai-hub/data/browse?project=test-project');
  });

  it('should show a table deletion error', () => {
    cy.intercept(
      'DELETE',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { statusCode: 403, body: 'Forbidden' },
    ).as('deleteTable');

    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');
    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-delete').click();
    cy.findByTestId('delete-asset-confirmation').type('claims-data');
    cy.findByTestId('delete-asset-confirm').click();
    cy.wait('@deleteTable');
    cy.findByText('API error 403: Forbidden').should('exist');
  });
});

describe('Volume Detail View', () => {
  beforeEach(() => {
    initIntercepts();
    cy.intercept(
      'GET',
      `${REGISTRY_API}/test-project/namespaces/default/volumes/training-documents`,
      { body: mockVolumeResponse },
    ).as('getVolume');
  });

  it('should display volume metadata as unified asset', () => {
    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-documents');
    cy.wait('@getVolume');

    cy.findByTestId('data-details-card').should('exist');
    cy.findByTestId('asset-description').should('contain.text', 'Training document storage');
    cy.findByTestId('asset-type').should('contain.text', 'Unstructured');
    cy.findByTestId('asset-collection').should('contain.text', 'default');
    cy.findByTestId('asset-location').should('contain.text', 's3://bucket/docs/training');
    cy.findByTestId('asset-owner').should('contain.text', '-'); // owner is null in mock
  });

  it('should display created and modified with user attribution', () => {
    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-documents');
    cy.wait('@getVolume');

    cy.findByTestId('asset-created-at').should('contain.text', 'by ml-team@example.com');
    cy.findByTestId('asset-updated-at').should('contain.text', 'by admin@example.com');
  });

  it('should display the unstructured format field', () => {
    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-documents');
    cy.wait('@getVolume');

    cy.findByTestId('asset-format').should('contain.text', 'Documents');
  });

  it('should display asset type badge and Overview tab', () => {
    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-documents');
    cy.wait('@getVolume');

    cy.findByTestId('asset-type-badge').should('contain.text', 'Data asset');
    cy.findByTestId('detail-tabs').should('exist');
    cy.contains('Overview').should('exist');
  });

  it('should display labels and properties cards', () => {
    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-documents');
    cy.wait('@getVolume');

    cy.findByTestId('labels-card').should('exist');
    cy.contains('source-docs').should('exist');
    cy.contains('unstructured').should('exist');

    cy.findByTestId('properties-card').should('exist');
    cy.contains('content-type: application/pdf').should('exist');
    cy.contains('purpose: training').should('exist');
    cy.contains('environment: production').should('exist');
  });

  it('should not display schema card for volumes', () => {
    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-documents');
    cy.wait('@getVolume');

    cy.findByTestId('schema-card').should('not.exist');
  });

  it('should handle delete action', () => {
    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-documents');
    cy.wait('@getVolume');

    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-delete').click();
    cy.findByTestId('delete-asset-modal').should('exist');
    cy.contains('Permanently delete "training-documents" unstructured asset?').should('exist');
  });

  it('should delete a volume and return to the data browse view', () => {
    cy.intercept(
      'DELETE',
      `${REGISTRY_API}/test-project/namespaces/default/volumes/training-documents`,
      { statusCode: 204 },
    ).as('deleteVolume');

    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-documents');
    cy.wait('@getVolume');
    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-delete').click();
    cy.findByTestId('delete-asset-confirmation').type('training-documents');
    cy.findByTestId('delete-asset-confirm').click();
    cy.wait('@deleteVolume');
    cy.url().should('include', '/ai-hub/data/browse?project=test-project');
  });

  it('should show a volume deletion error', () => {
    cy.intercept(
      'DELETE',
      `${REGISTRY_API}/test-project/namespaces/default/volumes/training-documents`,
      { statusCode: 404, body: 'Not found' },
    ).as('deleteVolume');

    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-documents');
    cy.wait('@getVolume');
    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-delete').click();
    cy.findByTestId('delete-asset-confirmation').type('training-documents');
    cy.findByTestId('delete-asset-confirm').click();
    cy.wait('@deleteVolume');
    cy.findByText('API error 404: Not found').should('exist');
  });
});
