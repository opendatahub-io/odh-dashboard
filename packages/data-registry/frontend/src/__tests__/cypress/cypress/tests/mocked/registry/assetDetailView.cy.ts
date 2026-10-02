/* eslint-disable camelcase */
import { mockModArchResponse } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';

const REGISTRY_API = '/data-registry/api/v1';
const MAIN_API = '/data-registry/api/v1';

const mockTableResponse = {
  name: 'claims-data',
  asset_type: 'table',
  uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  format: 'parquet',
  storage_location: 's3://bucket/claims',
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
  created_at: '2026-07-15T10:30:00Z',
  updated_at: '2026-08-20T14:45:00Z',
};

const mockVolumeResponse = {
  name: 'training-documents',
  asset_type: 'volume',
  uuid: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890',
  format: 'documents',
  storage_location: 's3://bucket/docs/training',
  collection: 'default',
  connection_ref: null,
  description: 'Training document storage',
  owner: 'ml-team',
  created_at: '2026-06-01T08:00:00Z',
  updated_at: '2026-08-10T12:00:00Z',
  labels: ['source-docs', 'unstructured'],
  properties: {
    'content-type': 'application/pdf',
    purpose: 'training',
    environment: 'production',
  },
};

const initIntercepts = () => {
  cy.intercept('GET', `${MAIN_API}/user`, {
    body: mockModArchResponse(mockUserSettings({ userId: 'test-user' })),
  });
  cy.intercept('GET', `${MAIN_API}/namespaces`, {
    body: mockModArchResponse([mockNamespace({ name: 'test-project' })]),
  });
  cy.intercept('GET', `${MAIN_API}/connections/test-project`, {
    body: mockModArchResponse([
      { name: 'my-s3-connection', displayName: 'My S3 Connection', connectionType: 's3' },
    ]),
  });
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
    cy.findByTestId('asset-format').should('contain.text', 'Apache Parquet');
    cy.findByTestId('asset-collection').should('contain.text', 'analytics');
    cy.findByTestId('asset-type').should('contain.text', 'Structured');
    cy.findByTestId('asset-location').should('contain.text', 's3://bucket/claims');
    cy.findByTestId('asset-owner').should('contain.text', 'data-team');
    cy.findByTestId('connection-ref-link').should('contain.text', 'my-s3-connection');
    cy.findByTestId('connection-type').should('contain.text', 's3');
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
    cy.findByTestId('asset-property-data.quality')
      .should('contain.text', 'data.quality')
      .and('contain.text', 'verified');
    cy.findByTestId('asset-property-source')
      .should('contain.text', 'source')
      .and('contain.text', 'etl-pipeline');

    cy.findByTestId('schema-card').should('exist');
    cy.findByTestId('schema-columns-table').should('exist');
    cy.findByTestId('schema-column-name-id').should('contain.text', 'id');
  });

  it('should display relative created and modified timestamps', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.findByTestId('asset-created-at')
      .should('not.contain.text', 'View timestamp')
      .find('.pf-v6-c-timestamp')
      .should('exist');
    cy.findByTestId('asset-updated-at')
      .should('not.contain.text', 'View timestamp')
      .find('.pf-v6-c-timestamp')
      .should('exist');
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
      { statusCode: 403, body: { error: { code: '403', message: 'Forbidden' } } },
    ).as('deleteTable');

    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');
    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-delete').click();
    cy.findByTestId('delete-asset-confirmation').type('claims-data');
    cy.findByTestId('delete-asset-confirm').click();
    cy.wait('@deleteTable');
    cy.findByText('status code 403: Forbidden').should('exist');
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
    cy.findByTestId('asset-owner').should('contain.text', 'ml-team');
  });

  it('should display relative created and modified timestamps', () => {
    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-documents');
    cy.wait('@getVolume');

    cy.findByTestId('asset-created-at')
      .should('not.contain.text', 'View timestamp')
      .find('.pf-v6-c-timestamp')
      .should('exist');
    cy.findByTestId('asset-updated-at')
      .should('not.contain.text', 'View timestamp')
      .find('.pf-v6-c-timestamp')
      .should('exist');
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
    cy.findByTestId('asset-property-content-type')
      .should('contain.text', 'content-type')
      .and('contain.text', 'application/pdf');
    cy.findByTestId('asset-property-purpose')
      .should('contain.text', 'Purpose')
      .and('contain.text', 'training');
    cy.findByTestId('asset-property-environment')
      .should('contain.text', 'environment')
      .and('contain.text', 'production');
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
      { statusCode: 404, body: { error: { code: '404', message: 'Not found' } } },
    ).as('deleteVolume');

    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-documents');
    cy.wait('@getVolume');
    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-delete').click();
    cy.findByTestId('delete-asset-confirmation').type('training-documents');
    cy.findByTestId('delete-asset-confirm').click();
    cy.wait('@deleteVolume');
    cy.findByText('status code 404: Not found').should('exist');
  });
});
