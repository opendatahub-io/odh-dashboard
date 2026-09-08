/* eslint-disable camelcase */
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockAssetResponse } from '~/__mocks__/mockAssetResponse';
import { mockVolumeInfo } from '~/__mocks__/mockVolumeInfo';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';
import { editAssetModal } from '~/__tests__/cypress/cypress/pages/editAssetModal';

const REGISTRY_API = '/data-registry/api/v1';

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

describe('Edit Table Asset', () => {
  const tableResponse = mockAssetResponse({
    name: 'claims-data',
    description: 'Claims processing data',
    format: 'parquet',
    location: 's3://bucket/claims',
    collection: 'analytics',
    connection_ref: { type: 'rhai', secret_name: 'my-s3-connection' },
    labels: ['production', 'claims'],
    properties: {
      purpose: 'fraud detection',
      license: 'internal-use',
      maturity: 'production',
      pii_status: 'contains-pii',
      'custom-key': 'custom-value',
    },
    columns: [
      { name: 'id', type: 'integer', nullable: false, description: 'Primary key' },
      { name: 'amount', type: 'float', nullable: true, description: 'Claim amount' },
    ],
  });

  beforeEach(() => {
    initIntercepts();
    cy.intercept(
      'GET',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: tableResponse },
    ).as('getTable');
  });

  it('should open edit modal and display pre-populated fields', () => {
    cy.visit('/main-view/tables/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-edit').click();

    editAssetModal.shouldBeOpen();
    editAssetModal.findNameInput().should('have.value', 'claims-data');
    editAssetModal.findDescriptionInput().should('have.value', 'Claims processing data');
    editAssetModal.findAssetTypeInput().should('have.value', 'Structured');
    editAssetModal.findFormatToggle().should('contain.text', 'Parquet');
    editAssetModal.findCollectionInput().should('have.value', 'analytics');
    editAssetModal.findConnectionToggle().should('contain.text', 'my-s3-connection');
    editAssetModal.findLocationInput().should('have.value', 's3://bucket/claims');
    editAssetModal.findPurposeInput().should('have.value', 'fraud detection');
  });

  it('should edit description and save table', () => {
    cy.visit('/main-view/tables/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: tableResponse },
    ).as('updateTable');
    cy.intercept('POST', `${REGISTRY_API}/test-project/labels`, { body: { name: 'new-label' } });

    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-edit').click();
    editAssetModal.shouldBeOpen();

    editAssetModal.findDescriptionInput().clear();
    editAssetModal.findDescriptionInput().type('Updated description');
    editAssetModal.findSaveButton().click();

    cy.wait('@updateTable').then((interception) => {
      expect(interception.request.body).to.have.property('description', 'Updated description');
    });
  });

  it('should add and remove labels', () => {
    cy.visit('/main-view/tables/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: tableResponse },
    ).as('updateTable');
    cy.intercept('POST', `${REGISTRY_API}/test-project/labels`, {
      body: { name: 'new-label' },
    }).as('createLabel');

    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-edit').click();
    editAssetModal.shouldBeOpen();

    editAssetModal.findLabel('production').should('exist');
    editAssetModal.findLabel('claims').should('exist');

    editAssetModal.findAddLabelButton().click();
    editAssetModal.findLabelsInput().type('new-label{enter}');

    editAssetModal.removeLabel('production');

    editAssetModal.findSaveButton().click();

    cy.wait('@updateTable').then((interception) => {
      expect(interception.request.body).to.have.property('add_labels');
      expect(interception.request.body.add_labels).to.include('new-label');
      expect(interception.request.body).to.have.property('remove_labels');
      expect(interception.request.body.remove_labels).to.include('production');
    });
  });

  it('should add and remove custom properties', () => {
    cy.visit('/main-view/tables/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: tableResponse },
    ).as('updateTable');

    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-edit').click();
    editAssetModal.shouldBeOpen();

    editAssetModal.findCustomPropertyKey(0).should('have.value', 'custom-key');
    editAssetModal.findCustomPropertyValue(0).should('have.value', 'custom-value');

    editAssetModal.findAddCustomPropertyButton().click();
    editAssetModal.findCustomPropertyKey(1).type('new-key');
    editAssetModal.findCustomPropertyValue(1).type('new-value');

    editAssetModal.findCustomPropertyRemove(0).click();

    editAssetModal.findSaveButton().click();

    cy.wait('@updateTable').then((interception) => {
      expect(interception.request.body).to.have.property('properties');
      expect(interception.request.body.properties).to.have.property('new-key', 'new-value');
      expect(interception.request.body.properties).to.not.have.property('custom-key');
    });
  });

  it('should display schema section and add a column', () => {
    cy.visit('/main-view/tables/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: tableResponse },
    ).as('updateTable');

    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-edit').click();
    editAssetModal.shouldBeOpen();

    editAssetModal.findSchemaColumnName(0).should('have.value', 'id');
    editAssetModal.findSchemaColumnTypeToggle(0).should('contain.text', 'integer');
    editAssetModal.findSchemaColumnName(1).should('have.value', 'amount');

    editAssetModal.findAddColumnButton().click();
    editAssetModal.findSchemaColumnName(2).type('status');

    editAssetModal.findSaveButton().click();

    cy.wait('@updateTable').then((interception) => {
      expect(interception.request.body).to.have.property('schema_fields');
      expect(interception.request.body.schema_fields).to.have.length(3);
      expect(interception.request.body.schema_fields[2]).to.have.property('name', 'status');
    });
  });

  it('should clear the final custom property', () => {
    cy.visit('/main-view/tables/test-project/analytics/claims-data');
    cy.wait('@getTable');
    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: tableResponse },
    ).as('updateTable');

    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-edit').click();
    editAssetModal.findCustomPropertyRemove(0).click();
    editAssetModal.findSaveButton().click();

    cy.wait('@updateTable').then((interception) => {
      expect(interception.request.body).to.have.property('properties').that.deep.equals({});
    });
  });

  it('should close modal on cancel', () => {
    cy.visit('/main-view/tables/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-edit').click();
    editAssetModal.shouldBeOpen();

    editAssetModal.findCancelButton().click();
    editAssetModal.shouldBeOpen(false);
  });
});

describe('Edit Volume Asset', () => {
  const volumeResponse = mockVolumeInfo({
    name: 'training-docs',
    comment: 'Training document storage',
    'storage-location': 's3://bucket/docs/training',
    labels: ['source-docs'],
    properties: { purpose: 'training' },
  });

  beforeEach(() => {
    initIntercepts();
    cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/default/volumes/training-docs`, {
      body: volumeResponse,
    }).as('getVolume');
  });

  it('should open edit modal for volume with pre-populated fields', () => {
    cy.visit('/main-view/volumes/test-project/default/training-docs');
    cy.wait('@getVolume');

    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-edit').click();

    editAssetModal.shouldBeOpen();
    editAssetModal.findNameInput().should('have.value', 'training-docs');
    editAssetModal.findDescriptionInput().should('have.value', 'Training document storage');
    editAssetModal.findAssetTypeInput().should('have.value', 'Unstructured');
    editAssetModal.findPurposeInput().should('have.value', 'training');
    editAssetModal.findAddColumnButton().should('not.exist');
  });

  it('should edit volume and save', () => {
    cy.visit('/main-view/volumes/test-project/default/training-docs');
    cy.wait('@getVolume');

    cy.intercept('PUT', `${REGISTRY_API}/test-project/namespaces/default/volumes/training-docs`, {
      body: volumeResponse,
    }).as('updateVolume');

    cy.findByTestId('asset-actions-toggle').click();
    cy.findByTestId('asset-action-edit').click();
    editAssetModal.shouldBeOpen();

    editAssetModal.findDescriptionInput().clear();
    editAssetModal.findDescriptionInput().type('Updated volume description');
    editAssetModal.findSaveButton().click();

    cy.wait('@updateVolume').then((interception) => {
      expect(interception.request.body).to.have.property('comment', 'Updated volume description');
    });
  });
});
