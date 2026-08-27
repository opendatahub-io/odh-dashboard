/* eslint-disable camelcase */
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

const REGISTRY_API = '/data-registry/api/v1';

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
      labels: ['embeddings'],
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

const initIntercepts = () => {
  cy.interceptApi(
    'GET /api/:apiVersion/user',
    { path: { apiVersion: CLIENT_API_VERSION } },
    mockUserSettings({ userId: 'test-user' }),
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
    cy.findByTestId('register-volume-modal').should('exist');
    cy.contains('Register data').should('exist');
    cy.contains(
      'Create a new data asset and configure its source location, metadata, and schema.',
    ).should('exist');
  });

  it('should show validation errors when submitting without required fields', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('register-volume-submit').click();

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

    cy.findByTestId('volume-name-input').type('new-volume');
    cy.findByTestId('volume-description-input').type('Test volume');

    cy.findByTestId('volume-format-toggle').click();
    cy.contains('Documents').click();

    cy.findByTestId('volume-collection-toggle').click();
    cy.contains('analytics').click();

    cy.findByTestId('volume-path-input').clear();
    cy.findByTestId('volume-path-input').type('/data/docs');

    cy.findByTestId('volume-purpose-input').type('ML training');

    cy.findByTestId('volume-license-toggle').click();
    cy.contains('Apache 2.0').click();

    cy.findByTestId('volume-maturity-toggle').click();
    cy.contains('Production').click();

    cy.findByTestId('volume-pii-toggle').click();
    cy.contains('None').click();

    cy.findByTestId('register-volume-submit').click();

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

    cy.findByTestId('register-volume-modal').should('not.exist');
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

    cy.findByTestId('volume-name-input').type('existing-volume');
    cy.findByTestId('volume-collection-toggle').click();
    cy.contains('analytics').click();

    cy.findByTestId('register-volume-submit').click();

    cy.wait('@createVolumeConflict');
    cy.contains('Error registering volume').should('exist');
    cy.findByTestId('register-volume-modal').should('exist');
  });

  it('should close modal and reset form on cancel', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('volume-name-input').type('test-volume');
    cy.contains('Cancel').click();
    cy.findByTestId('register-volume-modal').should('not.exist');

    cy.findByTestId('register-data-button').click();
    cy.findByTestId('volume-name-input').should('have.value', '');
  });

  it('should show asset type as disabled Unstructured', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();
    cy.findByTestId('asset-type-toggle').should('have.class', 'pf-m-disabled');
    cy.findByTestId('asset-type-toggle').should('contain.text', 'Unstructured');
  });

  it('should show "Create new collection" in collection dropdown', () => {
    visitWithData();
    cy.findByTestId('register-data-button').click();
    cy.findByTestId('volume-collection-toggle').click();
    cy.contains('Create new collection').should('exist');
  });
});
