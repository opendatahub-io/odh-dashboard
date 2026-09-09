/* eslint-disable camelcase */
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

const REGISTRY_API = '/data-registry/api/v1';

const mockConnectionsResponse = [
  { name: 'my-s3-connection', displayName: 'My S3 Connection', connectionType: 's3' },
  { name: 'my-uri-connection', displayName: 'My URI Connection', connectionType: 'uri' },
  { name: 'db-connection', displayName: 'Database Connection', connectionType: 'postgresql' },
];

const mockCollectionsResponse = {
  namespaces: [['analytics'], ['default']],
};

const mockAssetsResponse = {
  assets: [
    {
      name: 'claims-data',
      asset_type: 'table',
      format: 'parquet',
      location: 's3://bucket/claims',
      description: 'Claims processing data',
      labels: ['production', 'claims'],
      collection: 'analytics',
      connection_ref: null,
      owner: 'user1',
      registered_by: 'user1',
      created_at: '2026-01-01',
    },
    {
      name: 'embeddings',
      asset_type: 'table',
      format: 'milvus',
      location: 'milvus://embeddings',
      description: 'Vector embeddings',
      labels: ['embeddings', 'production'],
      collection: 'analytics',
      connection_ref: null,
      owner: 'user1',
      registered_by: 'user1',
      created_at: '2026-01-02',
    },
  ],
};

const mockVolumesResponse = {
  volumes: [
    {
      name: 'raw-docs',
      'catalog-name': 'test-project',
      'schema-name': 'analytics',
      'volume-type': 'application/pdf',
      'storage-location': 's3://bucket/docs',
      comment: null,
      owner: null,
      'created-at': '2026-01-01',
      'updated-at': null,
      labels: ['source-docs'],
      properties: { description: 'PDF documents' },
      config: {},
    },
  ],
};

const mockCollectionDetails = (name: string) => ({
  namespace: [name],
  properties: { description: `${name} collection` },
});

const mockLabelsResponse = {
  labels: ['production', 'claims', 'embeddings', 'source-docs'],
};

const initIntercepts = (options = {}) => {
  cy.interceptApi(
    'GET /api/:apiVersion/user',
    { path: { apiVersion: CLIENT_API_VERSION } },
    mockUserSettings({ userId: 'test-user', ...options }),
  );
  cy.interceptApi('GET /api/:apiVersion/namespaces', { path: { apiVersion: CLIENT_API_VERSION } }, [
    mockNamespace({ name: 'test-project' }),
    mockNamespace({ name: 'other-project' }),
  ]);

  cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces`, {
    body: mockCollectionsResponse,
  }).as('getCollections');
  cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/analytics`, {
    body: mockCollectionDetails('analytics'),
  }).as('getAnalyticsDetails');
  cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/default`, {
    body: mockCollectionDetails('default'),
  }).as('getDefaultDetails');
  cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/*/generic-tables`, {
    body: mockAssetsResponse,
  }).as('getAssets');
  cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/*/volumes`, {
    body: mockVolumesResponse,
  }).as('getVolumes');
  cy.intercept('GET', `${REGISTRY_API}/test-project/labels`, {
    body: mockLabelsResponse,
  }).as('getLabels');
  cy.interceptApi(
    'GET /api/:apiVersion/connections/:namespace',
    { path: { apiVersion: CLIENT_API_VERSION, namespace: 'test-project' } },
    mockConnectionsResponse,
  ).as('getConnections');
};

const visitWithData = () => {
  cy.visit('/main-view?project=test-project');
  cy.findByTestId('registry-table', { timeout: 15000 }).should('exist');
};

describe('Registry Table', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should display assets after selecting a project', () => {
    visitWithData();
    cy.contains('claims-data').should('exist');
    cy.contains('embeddings').should('exist');
    cy.contains('raw-docs').should('exist');
  });

  it('should show empty state when no project selected', () => {
    cy.visit('/main-view');
    cy.contains('Select a project').should('exist');
  });

  it('should filter assets by search text', () => {
    visitWithData();
    cy.contains('claims-data').should('exist');
    cy.contains('embeddings').should('exist');
    cy.findByTestId('asset-search').find('input').type('claims');
    cy.contains('claims-data').should('exist');
    cy.contains('embeddings').should('not.exist');
  });

  it('should open manage collections modal', () => {
    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-collections-action').click();
    cy.findByTestId('manage-collections-modal').should('exist');
    cy.findByTestId('create-collection-button').should('exist');
  });

  it('should render format badges', () => {
    visitWithData();
    cy.contains('parquet').should('exist');
    cy.contains('milvus').should('exist');
  });

  it('should render labels on assets', () => {
    visitWithData();
    cy.contains('production').should('exist');
    cy.contains('claims').should('exist');
  });

  it('should create a new collection', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/namespaces`, {
      statusCode: 200,
      body: { namespace: ['new-collection'], properties: { description: 'Test' } },
    }).as('createCollection');
    cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces`, {
      body: { namespaces: [['analytics'], ['default'], ['new-collection']] },
    }).as('getCollectionsAfterCreate');
    cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/new-collection`, {
      body: { namespace: ['new-collection'], properties: { description: 'Test' } },
    });

    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-collections-action').click();
    cy.findByTestId('create-collection-button').click();
    cy.findByTestId('create-collection-modal').should('exist');
    cy.findByTestId('collection-name-input').type('new-collection');
    cy.findByTestId('collection-description-input').type('A new test collection');
    cy.findByTestId('create-collection-submit').click();
    cy.wait('@createCollection').then((interception) => {
      expect(interception.request.body).to.deep.include({
        namespace: ['new-collection'],
      });
    });
  });

  it('should block delete when collection has assets', () => {
    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-collections-action').click();
    cy.findByTestId('collection-kebab-analytics').click();
    cy.contains('Delete').click();
    cy.findByTestId('delete-collection-modal').should('exist');
    cy.contains('Collection is not empty').should('exist');
    cy.findByTestId('confirm-delete-button').should('be.disabled');
  });

  it('should delete an empty collection with confirmation', () => {
    cy.intercept('DELETE', `${REGISTRY_API}/test-project/namespaces/empty-collection`, {
      statusCode: 204,
    }).as('deleteCollection');
    cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces`, {
      body: { namespaces: [['analytics'], ['default'], ['empty-collection']] },
    });
    cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/empty-collection`, {
      body: { namespace: ['empty-collection'], properties: { description: 'Empty' } },
    });
    cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/empty-collection/generic-tables`, {
      body: { assets: [] },
    });
    cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/empty-collection/volumes`, {
      body: { volumes: [] },
    });

    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-collections-action').click();
    cy.findByTestId('collection-kebab-empty-collection').click();
    cy.contains('Delete').click();
    cy.findByTestId('delete-collection-modal').should('exist');
    cy.contains('Collection is not empty').should('not.exist');
    cy.findByTestId('confirm-delete-input').type('empty-collection');
    cy.findByTestId('confirm-delete-button').should('be.enabled').click();
    cy.wait('@deleteCollection');
  });
});

describe('Register Volume', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should open register data modal', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();
    cy.findByTestId('register-data-modal').should('exist');
    cy.contains('Register data').should('exist');
    cy.contains(
      'Create a new data asset and configure its source location, metadata, and schema.',
    ).should('exist');
  });

  it('should show validation errors when submitting without required fields', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('register-data-submit').click();

    cy.contains('Asset name is required').should('exist');
    cy.contains('Collection is required').should('exist');
  });

  it('should submit volume with all fields', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/namespaces/analytics/volumes`, {
      statusCode: 200,
      body: {
        name: 'new-volume',
        'catalog-name': 'test-project',
        'schema-name': 'analytics',
        'volume-type': 'documents',
        'storage-location': '/data/docs',
        labels: ['production'],
        properties: {
          description: 'Test volume',
          purpose: 'ML training',
          license: 'apache-2.0',
          maturity: 'production',
          pii_status: 'none',
        },
        config: {},
      },
    }).as('createVolume');

    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('data-name-input').type('new-volume');
    cy.findByTestId('data-description-input').type('Test volume');

    cy.findByTestId('data-format-toggle').click();
    cy.contains('Documents').click();

    cy.findByTestId('data-collection-toggle').click();
    cy.contains('analytics').click();

    cy.findByTestId('data-path-input').clear();
    cy.findByTestId('data-path-input').type('/data/docs');

    cy.findByTestId('data-purpose-input').type('ML training');

    cy.findByTestId('data-license-toggle').click();
    cy.contains('Apache 2.0').click();

    cy.findByTestId('data-maturity-toggle').click();
    cy.contains('Production').click();

    cy.findByTestId('data-pii-toggle').click();
    cy.contains('None').click();

    cy.findByTestId('register-data-submit').click();

    cy.wait('@createVolume').then((interception) => {
      expect(interception.request.body).to.deep.include({
        name: 'new-volume',
        content_type: 'documents',
        description: 'Test volume',
        location: '/data/docs',
      });
      expect(interception.request.body.properties).to.deep.include({
        purpose: 'ML training',
        license: 'apache-2.0',
        maturity: 'production',
        pii_status: 'none',
      });
    });

    cy.findByTestId('register-data-modal').should('not.exist');
  });

  it('should display error on 409 conflict', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/namespaces/analytics/volumes`, {
      statusCode: 409,
      body: {
        error: { message: 'Volume already exists', type: 'AlreadyExistsException', code: 409 },
      },
    }).as('createVolumeConflict');

    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('data-name-input').type('existing-volume');
    cy.findByTestId('data-collection-toggle').click();
    cy.contains('analytics').click();

    cy.findByTestId('register-data-submit').click();

    cy.wait('@createVolumeConflict');
    cy.contains('Error registering data asset').should('exist');
    cy.findByTestId('register-data-modal').should('exist');
  });

  it('should close modal and reset form on cancel', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('data-name-input').type('test-volume');
    cy.contains('Cancel').click();
    cy.findByTestId('register-data-modal').should('not.exist');

    cy.findByTestId('register-data-button').click();
    cy.findByTestId('data-name-input').should('have.value', '');
  });

  it('should show asset type selector defaulting to Unstructured', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();
    cy.findByTestId('asset-type-toggle').should('not.have.class', 'pf-m-disabled');
    cy.findByTestId('asset-type-toggle').should('contain.text', 'Unstructured');
  });

  it('should show "Create new collection" in collection dropdown', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();
    cy.findByTestId('data-collection-toggle').click();
    cy.contains('Create new collection').should('exist');
  });
});

describe('Manage Labels', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should open manage labels modal from kebab menu', () => {
    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-labels-action').click();
    cy.findByTestId('manage-labels-modal').should('exist');
    cy.contains('Manage labels').should('exist');
    cy.contains(
      'Create and delete labels to manage how assets are organized across this project.',
    ).should('exist');
    cy.contains('Changes affect all project assets').should('exist');
  });

  it('should display labels with associated assets', () => {
    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-labels-action').click();

    cy.findByTestId('label-row-production').should('exist');
    cy.findByTestId('label-row-claims').should('exist');
    cy.findByTestId('label-row-embeddings').should('exist');
    cy.findByTestId('label-row-source-docs').should('exist');
  });

  it('should show label belonging to multiple assets', () => {
    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-labels-action').click();

    cy.findByTestId('label-row-production').should('contain.text', 'claims-data');
    cy.findByTestId('label-row-production').should('contain.text', 'embeddings');
  });

  it('should show dash for labels with no assets', () => {
    cy.intercept('GET', `${REGISTRY_API}/test-project/labels`, {
      body: { labels: ['orphan-label'] },
    }).as('getLabelsOrphan');

    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-labels-action').click();

    cy.findByTestId('label-row-orphan-label').should('contain.text', '–');
  });

  it('should filter labels by name', () => {
    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-labels-action').click();

    cy.findByTestId('label-filter').find('input').type('prod');
    cy.findByTestId('label-row-production').should('exist');
    cy.findByTestId('label-row-claims').should('not.exist');
    cy.findByTestId('label-row-source-docs').should('not.exist');
    cy.findByTestId('label-row-embeddings').should('not.exist');
  });

  it('should show create label inline row and confirm button disabled until input', () => {
    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-labels-action').click();

    cy.findByTestId('create-label-button').click();
    cy.findByTestId('create-label-row').should('exist');
    cy.findByTestId('new-label-input').should('exist');
    cy.findByTestId('confirm-create-label').should('be.disabled');

    cy.findByTestId('new-label-input').type('new-label');
    cy.findByTestId('confirm-create-label').should('not.be.disabled');
  });

  it('should create a new label', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/labels`, {
      statusCode: 201,
      body: { name: 'new-label' },
    }).as('createLabel');

    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-labels-action').click();

    cy.findByTestId('create-label-button').click();
    cy.findByTestId('new-label-input').type('new-label');
    cy.findByTestId('confirm-create-label').click();

    cy.wait('@createLabel').then((interception) => {
      expect(interception.request.body).to.deep.equal({ name: 'new-label' });
    });
  });

  it('should cancel create label', () => {
    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-labels-action').click();

    cy.findByTestId('create-label-button').click();
    cy.findByTestId('create-label-row').should('exist');
    cy.findByTestId('cancel-create-label').click();
    cy.findByTestId('create-label-row').should('not.exist');
  });

  it('should delete a label', () => {
    cy.intercept('DELETE', `${REGISTRY_API}/test-project/labels/claims`, {
      statusCode: 204,
    }).as('deleteLabel');

    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-labels-action').click();

    cy.findByTestId('delete-label-claims').click();
    cy.wait('@deleteLabel');
  });

  it('should show error on create label conflict', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/labels`, {
      statusCode: 409,
      body: { status_code: 409, detail: 'Label already exists: production' },
    }).as('createLabelConflict');

    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-labels-action').click();

    cy.findByTestId('create-label-button').click();
    cy.findByTestId('new-label-input').type('production');
    cy.findByTestId('confirm-create-label').click();

    cy.wait('@createLabelConflict');
    cy.findByTestId('manage-labels-error').should('exist');
  });

  it('should close modal', () => {
    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-labels-action').click();
    cy.findByTestId('manage-labels-modal').should('exist');

    cy.contains('button', 'Close').click();
    cy.findByTestId('manage-labels-modal').should('not.exist');
  });
});

describe('Register Table', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should switch to Structured asset type and show schema section', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('asset-type-toggle').should('contain.text', 'Unstructured');
    cy.findByText('Schema').should('not.exist');

    cy.findByTestId('asset-type-toggle').scrollIntoView();
    cy.findByTestId('asset-type-toggle').click();
    cy.findByTestId('asset-type-structured').click();

    cy.findByTestId('asset-type-toggle').should('contain.text', 'Structured');
    cy.findByText('Schema').should('exist');
    cy.findByTestId('add-schema-column').should('exist');
  });

  it('should show structured format options after switching asset type', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('asset-type-toggle').scrollIntoView();
    cy.findByTestId('asset-type-toggle').click();
    cy.findByTestId('asset-type-structured').click();

    cy.findByTestId('data-format-toggle').click();
    cy.contains('Apache Iceberg').should('exist');
    cy.contains('Parquet').should('exist');
    cy.contains('CSV').should('exist');
    cy.contains('Delta Lake').should('exist');
    cy.contains('Documents').should('not.exist');
    cy.contains('Images').should('not.exist');
  });

  it('should add and remove schema columns', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('asset-type-toggle').scrollIntoView();
    cy.findByTestId('asset-type-toggle').click();
    cy.findByTestId('asset-type-structured').click();

    cy.findByTestId('add-schema-column').click();
    cy.findByTestId('schema-column-name-0').should('exist');
    cy.findByTestId('schema-column-type-0').should('exist');

    cy.findByTestId('add-schema-column').click();
    cy.findByTestId('schema-column-name-1').should('exist');

    cy.findByTestId('schema-column-remove-0').click();
    cy.findByTestId('schema-column-name-0').should('exist');
    cy.findByTestId('schema-column-name-1').should('not.exist');
  });

  it('should submit table with schema fields to generic-tables endpoint', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables`, {
      statusCode: 200,
      body: {
        name: 'test-table',
        asset_type: 'table',
        format: 'parquet',
        location: '',
        description: 'A test table',
        labels: [],
        collection: 'analytics',
        connection_ref: null,
        owner: 'user1',
        registered_by: 'user1',
        created_at: '2026-01-01',
      },
    }).as('createTable');

    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('asset-type-toggle').scrollIntoView();
    cy.findByTestId('asset-type-toggle').click();
    cy.findByTestId('asset-type-structured').click();

    cy.findByTestId('data-name-input').type('test-table');
    cy.findByTestId('data-description-input').type('A test table');

    cy.findByTestId('data-format-toggle').click();
    cy.contains('Parquet').click();

    cy.findByTestId('data-collection-toggle').click();
    cy.contains('analytics').click();

    cy.findByTestId('add-schema-column').click();
    cy.findByTestId('schema-column-name-0').type('claim_id');
    cy.findByTestId('schema-column-type-0').click();
    cy.contains('integer').click();

    cy.findByTestId('add-schema-column').click();
    cy.findByTestId('schema-column-name-1').type('amount');
    cy.findByTestId('schema-column-type-1').click();
    cy.contains('double').click();

    cy.findByTestId('register-data-submit').click();

    cy.wait('@createTable').then((interception) => {
      expect(interception.request.body).to.deep.include({
        name: 'test-table',
        format: 'parquet',
        description: 'A test table',
      });
      expect(interception.request.body.schema_fields).to.have.length(2);
      expect(interception.request.body.schema_fields[0]).to.deep.include({
        name: 'claim_id',
        type: 'integer',
      });
      expect(interception.request.body.schema_fields[1]).to.deep.include({
        name: 'amount',
        type: 'double',
      });
    });

    cy.findByTestId('register-data-modal').should('not.exist');
  });

  it('should clear schema fields when switching back to Unstructured', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('asset-type-toggle').scrollIntoView();
    cy.findByTestId('asset-type-toggle').click();
    cy.findByTestId('asset-type-structured').click();

    cy.findByTestId('add-schema-column').click();
    cy.findByTestId('schema-column-name-0').type('test-col');

    cy.findByTestId('asset-type-toggle').scrollIntoView();
    cy.findByTestId('asset-type-toggle').click();
    cy.findByTestId('asset-type-unstructured').click();

    cy.findByText('Schema').should('not.exist');
    cy.findByTestId('schema-column-name-0').should('not.exist');

    cy.findByTestId('asset-type-toggle').scrollIntoView();
    cy.findByTestId('asset-type-toggle').click();
    cy.findByTestId('asset-type-structured').click();

    cy.findByTestId('schema-column-name-0').should('not.exist');
  });

  it('should display error on table creation failure', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables`, {
      statusCode: 409,
      body: {
        error: { message: 'Table already exists', type: 'AlreadyExistsException', code: 409 },
      },
    }).as('createTableConflict');

    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('asset-type-toggle').scrollIntoView();
    cy.findByTestId('asset-type-toggle').click();
    cy.findByTestId('asset-type-structured').click();

    cy.findByTestId('data-name-input').type('existing-table');
    cy.findByTestId('data-collection-toggle').click();
    cy.contains('analytics').click();

    cy.findByTestId('register-data-submit').click();

    cy.wait('@createTableConflict');
    cy.contains('Error registering data asset').should('exist');
    cy.findByTestId('register-data-modal').should('exist');
  });
});

describe('Connection Selector', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should display available connections in dropdown', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('data-connection-toggle').click();
    cy.contains('My S3 Connection').should('exist');
    cy.contains('My URI Connection').should('exist');
    cy.contains('Database Connection').should('exist');
  });

  it('should select a connection and display it in the toggle', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('data-connection-toggle').should('contain.text', 'Select a connection');
    cy.findByTestId('data-connection-toggle').click();
    cy.contains('My S3 Connection').click();

    cy.findByTestId('data-connection-toggle').should('contain.text', 'My S3 Connection');
  });

  it('should show no connections available when empty', () => {
    cy.interceptApi(
      'GET /api/:apiVersion/connections/:namespace',
      { path: { apiVersion: CLIENT_API_VERSION, namespace: 'test-project' } },
      [],
    ).as('getEmptyConnections');

    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('data-connection-toggle').click();
    cy.contains('No connections available').should('exist');
  });

  it('should include connection_ref in volume creation request', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/namespaces/analytics/volumes`, {
      statusCode: 200,
      body: {
        name: 'connected-volume',
        'catalog-name': 'test-project',
        'schema-name': 'analytics',
        'volume-type': 'other',
        'storage-location': '',
        config: {},
      },
    }).as('createVolumeWithConnection');

    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('data-name-input').type('connected-volume');

    cy.findByTestId('data-collection-toggle').click();
    cy.contains('analytics').click();

    cy.findByTestId('data-connection-toggle').click();
    cy.contains('My S3 Connection').click();

    cy.findByTestId('register-data-submit').click();

    cy.wait('@createVolumeWithConnection').then((interception) => {
      expect(interception.request.body).to.deep.include({
        name: 'connected-volume',
        content_type: 'other',
        connection_ref: 'my-s3-connection',
      });
    });
  });

  it('should include connection_ref in table creation request', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables`, {
      statusCode: 200,
      body: {
        name: 'connected-table',
        asset_type: 'table',
        format: 'iceberg',
        connection_ref: 'my-uri-connection',
      },
    }).as('createTableWithConnection');

    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('asset-type-toggle').scrollIntoView();
    cy.findByTestId('asset-type-toggle').click();
    cy.findByTestId('asset-type-structured').click();

    cy.findByTestId('data-name-input').type('connected-table');

    cy.findByTestId('data-collection-toggle').click();
    cy.contains('analytics').click();

    cy.findByTestId('data-connection-toggle').click();
    cy.contains('My URI Connection').click();

    cy.findByTestId('register-data-submit').click();

    cy.wait('@createTableWithConnection').then((interception) => {
      expect(interception.request.body).to.deep.include({
        name: 'connected-table',
        format: 'iceberg',
        connection_ref: 'my-uri-connection',
      });
    });
  });

  it('should include owner field when creating volume', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/namespaces/analytics/volumes`, {
      statusCode: 200,
      body: {
        name: 'test-volume',
        'catalog-name': 'test-project',
        'schema-name': 'analytics',
        'volume-type': 'other',
        'storage-location': '',
      },
    }).as('createVolume');

    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('data-name-input').type('test-volume');

    cy.findByTestId('data-collection-toggle').click();
    cy.contains('analytics').click();

    cy.findByTestId('register-data-submit').click();

    cy.wait('@createVolume').then((interception) => {
      expect(interception.request.body).to.deep.include({
        name: 'test-volume',
        content_type: 'other',
        owner: 'test-user',
      });
    });
  });

  it('should include owner field when creating table', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables`, {
      statusCode: 200,
      body: {
        name: 'test-table',
        asset_type: 'table',
        format: 'iceberg',
      },
    }).as('createTable');

    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('asset-type-toggle').click();
    cy.findByTestId('asset-type-structured').click();

    cy.findByTestId('data-name-input').type('test-table');

    cy.findByTestId('data-collection-toggle').click();
    cy.contains('analytics').click();

    cy.findByTestId('register-data-submit').click();

    cy.wait('@createTable').then((interception) => {
      expect(interception.request.body).to.deep.include({
        name: 'test-table',
        format: 'iceberg',
        owner: 'test-user',
      });
    });
  });

  it('should allow selecting Unassigned as owner', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/namespaces/analytics/volumes`, {
      statusCode: 200,
      body: {
        name: 'unassigned-volume',
        'catalog-name': 'test-project',
        'schema-name': 'analytics',
        'volume-type': 'other',
        'storage-location': '',
      },
    }).as('createVolume');

    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('data-name-input').type('unassigned-volume');

    cy.findByTestId('data-collection-toggle').click();
    cy.contains('analytics').click();

    // Scroll up to see owner field (it's above collection)
    cy.findByTestId('data-name-input').scrollIntoView();

    cy.findByPlaceholderText('Select or type owner', { timeout: 10000 }).should('be.visible');
    cy.findByPlaceholderText('Select or type owner').clear();
    cy.findByPlaceholderText('Select or type owner').type('Unas');
    cy.contains('li', 'Unassigned').click();

    cy.findByTestId('register-data-submit').click();

    cy.wait('@createVolume').then((interception) => {
      expect(interception.request.body).to.deep.include({
        name: 'unassigned-volume',
        owner: 'Unassigned',
      });
    });
  });
});

describe('Create Collection with Owner', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should include owner field when creating collection', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/namespaces`, {
      statusCode: 200,
      body: {
        namespace: ['new-collection'],
        properties: {},
      },
    }).as('createCollection');

    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-collections-action').click();
    cy.findByTestId('create-collection-button').click();

    cy.findByTestId('collection-name-input').type('new-collection');

    cy.findByTestId('create-collection-submit').click();

    cy.wait('@createCollection').then((interception) => {
      expect(interception.request.body).to.deep.include({
        namespace: ['new-collection'],
        owner: 'test-user',
      });
    });
  });

  it('should allow selecting Unassigned as collection owner', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/namespaces`, {
      statusCode: 200,
      body: {
        namespace: ['unassigned-collection'],
        properties: {},
      },
    }).as('createCollection');

    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-collections-action').click();
    cy.findByTestId('create-collection-button').click();

    cy.findByTestId('collection-name-input').type('unassigned-collection');

    // Ensure form is ready and owner field is visible
    cy.findByTestId('collection-name-input').scrollIntoView();

    cy.findByPlaceholderText('Select or type owner', { timeout: 10000 }).should('be.visible');
    cy.findByPlaceholderText('Select or type owner').clear();
    cy.findByPlaceholderText('Select or type owner').type('Unas');
    cy.contains('li', 'Unassigned').click();

    cy.findByTestId('create-collection-submit').click();

    cy.wait('@createCollection').then((interception) => {
      expect(interception.request.body).to.deep.include({
        namespace: ['unassigned-collection'],
        owner: 'Unassigned',
      });
    });
  });
});
