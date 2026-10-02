/* eslint-disable camelcase */
import { mockModArchResponse } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';

const REGISTRY_API = '/data-registry/api/v1';
const MAIN_API = '/data-registry/api/v1';

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
      uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      format: 'parquet',
      storage_location: 's3://bucket/claims',
      description: 'Claims processing data',
      labels: ['production', 'claims'],
      properties: { 'data-domain': 'claims' },
      collection: 'analytics',
      connection_ref: null,
      owner: 'user1',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    },
    {
      name: 'embeddings',
      asset_type: 'table',
      uuid: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890',
      format: 'milvus',
      storage_location: 'milvus://embeddings',
      description: 'Vector embeddings',
      labels: ['embeddings', 'production'],
      properties: { 'data-domain': 'vector-search' },
      collection: 'analytics',
      connection_ref: null,
      owner: 'user1',
      created_at: '2026-01-02',
      updated_at: '2026-01-03',
    },
  ],
};

const mockVolumesResponse = {
  volumes: [
    {
      name: 'raw-docs',
      asset_type: 'volume',
      uuid: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
      format: 'documents',
      storage_location: 's3://bucket/docs',
      collection: 'analytics',
      connection_ref: null,
      description: 'PDF documents',
      owner: 'user1',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
      labels: ['source-docs'],
      properties: { 'retention-class': 'long-term' },
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
  cy.intercept('GET', `${MAIN_API}/user`, {
    body: mockModArchResponse(mockUserSettings({ userId: 'test-user', ...options })),
  });
  cy.intercept('GET', `${MAIN_API}/namespaces`, {
    body: mockModArchResponse([
      mockNamespace({ name: 'other-project' }),
      mockNamespace({ name: 'test-project' }),
    ]),
  });

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
  cy.intercept('GET', `${MAIN_API}/connections/test-project`, {
    body: mockModArchResponse(mockConnectionsResponse),
  }).as('getConnections');
};

const visitWithData = () => {
  cy.visit('/ai-hub/data/browse?project=test-project');
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

  it('should select the persisted project when no project is provided in the URL', () => {
    cy.visit('/ai-hub/data/browse', {
      onBeforeLoad: (window) => {
        window.localStorage.setItem('mod-arch.namespace.lastUsed', JSON.stringify('test-project'));
      },
    });
    cy.url().should('include', '/ai-hub/data/browse?project=test-project');
    cy.findByTestId('registry-table', { timeout: 15000 }).should('exist');
  });

  it('should show the no-projects state when no projects are available', () => {
    cy.intercept('GET', `${MAIN_API}/namespaces`, {
      body: mockModArchResponse([]),
    });

    cy.visit('/ai-hub/data/browse');
    cy.findByTestId('no-projects-empty-state').should('exist');
    cy.findByRole('img', { name: 'No projects' }).should('be.visible');
    cy.findByRole('heading', { name: 'No projects' }).should('exist');
    cy.findByRole('button', { name: 'Create project' }).should('exist');
  });

  it('should filter assets by search text', () => {
    visitWithData();
    cy.contains('claims-data').should('exist');
    cy.contains('embeddings').should('exist');
    cy.findByTestId('asset-search').find('input').type('claims');
    cy.contains('claims-data').should('exist');
    cy.contains('embeddings').should('not.exist');
  });

  it('should filter assets by property key and value', () => {
    visitWithData();
    cy.findByTestId('asset-search').find('input').type('retention-class');
    cy.contains('raw-docs').should('exist');
    cy.contains('claims-data').should('not.exist');
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
    cy.findByTestId('registry-table').should('contain.text', 'Apache Parquet');
    cy.findByTestId('registry-table').should('contain.text', 'Milvus');
  });

  it('should render labels on assets', () => {
    visitWithData();
    cy.contains('production').should('exist');
    cy.contains('claims').should('exist');
  });

  it('should delete a table from the browse view', () => {
    cy.intercept(
      'DELETE',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { statusCode: 204 },
    ).as('deleteTable');

    visitWithData();
    cy.findByTestId('asset-actions-table-analytics-claims-data').click();
    cy.findByTestId('asset-delete-table-analytics-claims-data').click();
    cy.findByTestId('delete-asset-confirmation').type('claims-data');
    cy.findByTestId('delete-asset-confirm').click();
    cy.wait('@deleteTable');
    cy.findByTestId('delete-asset-modal').should('not.exist');
  });

  it('should open the edit modal from the browse view without navigating', () => {
    visitWithData();
    cy.findByTestId('asset-actions-table-analytics-claims-data').click();
    cy.findByTestId('asset-edit-table-analytics-claims-data').click();
    cy.url().should('include', '/ai-hub/data/browse?project=test-project');
    cy.findByTestId('edit-asset-modal').should('exist');
  });

  it('should delete a volume from the browse view', () => {
    cy.intercept('DELETE', `${REGISTRY_API}/test-project/namespaces/analytics/volumes/raw-docs`, {
      statusCode: 204,
    }).as('deleteVolume');

    visitWithData();
    cy.findByTestId('asset-actions-volume-analytics-raw-docs').click();
    cy.findByTestId('asset-delete-volume-analytics-raw-docs').click();
    cy.findByTestId('delete-asset-confirmation').type('raw-docs');
    cy.findByTestId('delete-asset-confirm').click();
    cy.wait('@deleteVolume');
    cy.findByTestId('delete-asset-modal').should('not.exist');
  });

  it('should clamp pagination after deleting the only asset on the last page', () => {
    const lastPageAssetName = 'last-page-asset';
    let analyticsAssets = [
      ...mockAssetsResponse.assets,
      ...Array.from({ length: 9 }, (_, index) => ({
        ...mockAssetsResponse.assets[0],
        name: index === 8 ? lastPageAssetName : `extra-asset-${index}`,
      })),
    ];

    cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces`, {
      body: { namespaces: [['analytics']] },
    });
    cy.intercept(
      'GET',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables`,
      (request) => request.reply({ body: { assets: analyticsAssets } }),
    ).as('getAnalyticsAssets');
    cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/analytics/volumes`, {
      body: { volumes: [] },
    });
    cy.intercept(
      'DELETE',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/${lastPageAssetName}`,
      (request) => {
        analyticsAssets = analyticsAssets.filter((asset) => asset.name !== lastPageAssetName);
        request.reply({ statusCode: 204 });
      },
    ).as('deleteLastPageAsset');

    visitWithData();
    cy.wait('@getAnalyticsAssets');

    const pagination = () => cy.findByTestId('registry-pagination');
    pagination().find('[data-action=next]').click();
    cy.findByText(lastPageAssetName).should('exist');

    cy.findByTestId(`asset-actions-table-analytics-${lastPageAssetName}`).click();
    cy.findByTestId(`asset-delete-table-analytics-${lastPageAssetName}`).click();
    cy.findByTestId('delete-asset-confirmation').type(lastPageAssetName);
    cy.findByTestId('delete-asset-confirm').click();

    cy.wait('@deleteLastPageAsset');
    cy.wait('@getAnalyticsAssets');
    pagination().findByRole('spinbutton', { name: 'Current page' }).should('have.value', '1');
    cy.findByText('claims-data').should('exist');
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

  it('should disable delete when collection has assets', () => {
    visitWithData();
    cy.findByTestId('registry-kebab').click();
    cy.findByTestId('manage-collections-action').click();
    cy.findByTestId('collection-delete-analytics').should('be.disabled');
    cy.findByTestId('manage-collections-modal').should('exist');
    cy.findByTestId('delete-collection-modal').should('not.exist');
  });

  it('should delete an empty collection without confirmation text', () => {
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
    cy.findByTestId('collection-delete-empty-collection').click();
    cy.findByTestId('delete-collection-modal').should('exist');
    cy.findByTestId('manage-collections-modal').should('not.exist');
    cy.contains(
      'The empty-collection collection will be deleted. It contains no data assets.',
    ).should('exist');
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
        asset_type: 'volume',
        uuid: 'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
        format: 'documents',
        storage_location: '/data/docs',
        collection: 'analytics',
        owner: 'user1',
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
        labels: ['production'],
        properties: {
          description: 'Test volume',
          purpose: 'ML training',
          license: 'apache-2.0',
          maturity: 'production',
          pii: 'none',
        },
        config: {},
      },
    }).as('createVolume');

    visitWithData();
    cy.findByTestId('register-data-button').click();

    cy.findByTestId('data-name-input').type('new-volume');
    cy.findByTestId('data-description-input').type('Test volume');

    cy.findByTestId('data-format-toggle').click();
    cy.findByTestId('data-format-option-documents').click();

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
        format: 'documents',
        description: 'Test volume',
        storage_location: '/data/docs',
        purpose: 'ML training',
        license: 'apache-2.0',
        maturity: 'production',
        pii: 'none',
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
    cy.contains('Apache Parquet').should('exist');
    cy.contains('CSV').should('exist');
    cy.contains('Delta Lake').should('exist');
    cy.findByTestId('data-format-option-documents').should('not.exist');
    cy.findByTestId('data-format-option-images').should('not.exist');
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
        uuid: 'e1f2a3b4-c5d6-7890-abcd-ef1234567890',
        format: 'parquet',
        storage_location: null,
        description: 'A test table',
        labels: [],
        collection: 'analytics',
        connection_ref: null,
        owner: 'user1',
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
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
    cy.findByTestId('data-format-option-parquet').click();

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
    cy.intercept('GET', `${MAIN_API}/connections/test-project`, {
      body: mockModArchResponse([]),
    }).as('getEmptyConnections');

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
        asset_type: 'volume',
        uuid: 'f1a2b3c4-d5e6-7890-abcd-ef1234567890',
        format: 'other',
        storage_location: null,
        collection: 'analytics',
        owner: 'user1',
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
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
        format: 'other',
        connection_ref: {
          type: 'rhai',
          secret_name: 'my-s3-connection',
        },
      });
    });
  });

  it('should include connection_ref in table creation request', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables`, {
      statusCode: 200,
      body: {
        name: 'connected-table',
        asset_type: 'table',
        uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        format: 'iceberg',
        storage_location: null,
        collection: 'analytics',
        connection_ref: { type: 'rhai', secret_name: 'my-uri-connection' },
        owner: 'user1',
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
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
        connection_ref: {
          type: 'rhai',
          secret_name: 'my-uri-connection',
        },
      });
    });
  });

  it('should not send server-managed owner fields when creating an asset', () => {
    cy.intercept('POST', `${REGISTRY_API}/test-project/namespaces/analytics/volumes`, {
      statusCode: 200,
      body: {
        name: 'test-volume',
        asset_type: 'volume',
        uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        format: 'other',
        collection: 'analytics',
        owner: 'user1',
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      },
    }).as('createVolume');

    visitWithData();
    cy.findByTestId('register-data-button').click();
    cy.findByTestId('data-name-input').type('test-volume');
    cy.findByTestId('data-collection-toggle').click();
    cy.contains('analytics').click();
    cy.findByTestId('register-data-submit').click();

    cy.wait('@createVolume').then((interception) => {
      expect(interception.request.body).to.have.property('format', 'other');
      expect(interception.request.body).not.to.have.property('owner');
    });
  });
});

describe('Create Collection', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should use the creator as owner without displaying an owner field', () => {
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
      });
      expect(interception.request.body.properties).to.include({
        owner: 'test-user',
      });
    });
  });
});
