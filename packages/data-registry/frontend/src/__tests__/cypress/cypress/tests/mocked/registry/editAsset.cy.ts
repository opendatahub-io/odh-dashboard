/* eslint-disable camelcase */
import { mockModArchResponse } from 'mod-arch-core';
import { mockRhaiConnection } from '~/__mocks__/mockConnection';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockAssetResponse } from '~/__mocks__/mockAssetResponse';
import { mockVolumeInfo } from '~/__mocks__/mockVolumeInfo';
import { assetDetailPage } from '~/__tests__/cypress/cypress/pages/assetDetailPage';
import { editAssetModal } from '~/__tests__/cypress/cypress/pages/editAssetModal';

const REGISTRY_API = '/data-registry/api/v1';
const MAIN_API = '/data-registry/api/v1';

const initIntercepts = () => {
  cy.intercept('GET', `${MAIN_API}/user`, {
    body: mockModArchResponse(mockUserSettings({ userId: 'test-user' })),
  });
  cy.intercept('GET', `${MAIN_API}/namespaces`, {
    body: mockModArchResponse([mockNamespace({ name: 'test-project' })]),
  });
  cy.intercept('GET', `${MAIN_API}/connections/test-project`, {
    body: mockModArchResponse([mockRhaiConnection()]),
  });
};

describe('Edit Table Asset', () => {
  const tableResponse = mockAssetResponse({
    name: 'claims-data',
    description: 'Claims processing data',
    format: 'parquet',
    storage_location: 's3://bucket/claims',
    collection: 'analytics',
    connection_ref: { type: 'rhai', secret_name: 'my-s3-connection' },
    labels: ['production', 'claims'],
    properties: {
      purpose: 'fraud detection',
      license: 'internal-use',
      maturity: 'production',
      pii: 'contains-pii',
      'custom-key': 'custom-value',
    },
    columns: [
      { name: 'id', type: 'integer', nullable: false, description: 'Primary key' },
      { name: 'amount', type: 'float', nullable: true, description: 'Claim amount' },
    ],
  });
  const tableWithoutOptionalMetadataResponse = mockAssetResponse({
    name: 'unclassified-data',
    description: 'Data without optional metadata',
    collection: 'analytics',
    properties: {},
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
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();

    editAssetModal.shouldBeOpen();
    editAssetModal.findNameInput().should('have.value', 'claims-data');
    editAssetModal.findDescriptionInput().should('have.value', 'Claims processing data');
    editAssetModal.findAssetTypeInput().should('have.value', 'Structured');
    editAssetModal.findFormatToggle().should('contain.text', 'Parquet');
    editAssetModal.findCollectionInput().should('have.value', 'analytics');
    editAssetModal.findConnectionToggle().should('contain.text', 'My S3 Connection');
    editAssetModal.findLocationInput().should('have.value', 's3://bucket/claims');
    editAssetModal.findPurposeInput().should('have.value', 'fraud detection');
  });

  it('should preserve an unchanged DCH connection reference', () => {
    const dchTableResponse = mockAssetResponse({
      name: 'dch-table',
      connection_ref: { type: 'dch', id: 'dch-connection' },
    });
    cy.intercept(
      'GET',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/dch-table`,
      { body: dchTableResponse },
    ).as('getDchTable');
    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/dch-table`,
      { body: dchTableResponse },
    ).as('updateDchTable');

    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/dch-table');
    cy.wait('@getDchTable');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();
    editAssetModal.findSaveButton().click();

    cy.wait('@updateDchTable').then((interception) => {
      expect(interception.request.body).not.to.have.property('connection_ref');
    });
  });

  it('should edit description and save table', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: tableResponse },
    ).as('updateTable');
    cy.intercept('POST', `${REGISTRY_API}/test-project/labels`, { body: { name: 'new-label' } });

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();
    editAssetModal.shouldBeOpen();

    editAssetModal.findDescriptionInput().clear();
    editAssetModal.findDescriptionInput().type('Updated description');
    editAssetModal.findSaveButton().click();

    cy.wait('@updateTable').then((interception) => {
      expect(interception.request.body).to.have.property('description', 'Updated description');
    });
  });

  it('should preserve unknown governance values when only the description changes', () => {
    const legacyTableResponse = mockAssetResponse({
      name: 'legacy-table',
      description: 'Legacy table',
      collection: 'analytics',
      properties: {
        license: 'MIT',
        maturity: 'legacy',
        pii: 'yes',
      },
    });
    cy.intercept(
      'GET',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/legacy-table`,
      { body: legacyTableResponse },
    ).as('getLegacyTable');
    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/legacy-table`,
      { body: legacyTableResponse },
    ).as('updateLegacyTable');

    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/legacy-table');
    cy.wait('@getLegacyTable');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();
    editAssetModal.findDescriptionInput().clear();
    editAssetModal.findDescriptionInput().type('Updated legacy description');
    editAssetModal.findSaveButton().click();

    cy.wait('@updateLegacyTable').then((interception) => {
      expect(interception.request.body).to.not.have.property('license');
      expect(interception.request.body).to.not.have.property('maturity');
      expect(interception.request.body).to.not.have.property('pii');
    });
  });

  it('should clear the purpose when it is removed', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: tableResponse },
    ).as('updateTable');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();
    editAssetModal.findPurposeInput().clear();
    editAssetModal.findSaveButton().click();

    cy.wait('@updateTable').then((interception) => {
      expect(interception.request.body).to.have.property('purpose', null);
    });
  });

  it('should omit unchanged unset optional table metadata', () => {
    cy.intercept(
      'GET',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/unclassified-data`,
      { body: tableWithoutOptionalMetadataResponse },
    ).as('getTableWithoutOptionalMetadata');
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/unclassified-data');
    cy.wait('@getTableWithoutOptionalMetadata');

    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/unclassified-data`,
      { body: tableWithoutOptionalMetadataResponse },
    ).as('updateTableWithoutOptionalMetadata');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();
    editAssetModal.findSaveButton().click();

    cy.wait('@updateTableWithoutOptionalMetadata').then((interception) => {
      expect(interception.request.body).not.to.have.property('license');
      expect(interception.request.body).not.to.have.property('maturity');
      expect(interception.request.body).not.to.have.property('pii');
    });
  });

  it('should clear nullable table metadata', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: tableResponse },
    ).as('clearTableMetadata');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();

    editAssetModal.findLicenseToggle().click();
    editAssetModal.findClearLicenseOption().click();
    editAssetModal.findMaturityToggle().click();
    editAssetModal.findClearMaturityOption().click();
    editAssetModal.findPiiToggle().click();
    editAssetModal.findClearPiiOption().click();
    editAssetModal.findSaveButton().click();

    cy.wait('@clearTableMetadata').then((interception) => {
      expect(interception.request.body).to.include({
        license: null,
        maturity: null,
        pii: null,
      });
    });
  });

  it('should add and remove labels', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: tableResponse },
    ).as('updateTable');
    cy.intercept('POST', `${REGISTRY_API}/test-project/labels`, {
      body: { name: 'new-label' },
    }).as('createLabel');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();
    editAssetModal.shouldBeOpen();

    editAssetModal.findLabelInput(0).should('have.value', 'production');
    editAssetModal.findLabelInput(1).should('have.value', 'claims');

    editAssetModal.findAddLabelButton().click();
    editAssetModal.findLabelInput(2).type('new-label');

    editAssetModal.removeLabel(0);

    editAssetModal.findSaveButton().click();

    cy.wait('@updateTable').then((interception) => {
      expect(interception.request.body).to.have.property('add_labels');
      expect(interception.request.body.add_labels).to.include('new-label');
      expect(interception.request.body).to.have.property('remove_labels');
      expect(interception.request.body.remove_labels).to.include('production');
    });
  });

  it('should add custom properties and preserve existing properties', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: tableResponse },
    ).as('updateTable');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();
    editAssetModal.shouldBeOpen();

    editAssetModal.findCustomPropertyKey(0).should('have.value', 'custom-key');
    editAssetModal.findCustomPropertyValue(0).should('have.value', 'custom-value');

    editAssetModal.findAddCustomPropertyButton().click();
    editAssetModal.findCustomPropertyKey(1).type('new-key');
    editAssetModal.findCustomPropertyValue(1).type('new-value');

    editAssetModal.findSaveButton().click();

    cy.wait('@updateTable').then((interception) => {
      expect(interception.request.body).to.have.property('properties');
      expect(interception.request.body.properties).to.have.property('custom-key', 'custom-value');
      expect(interception.request.body.properties).to.have.property('new-key', 'new-value');
    });
  });

  it('should not remove a custom property when its value is cleared', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: tableResponse },
    ).as('preserveCustomProperty');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();
    editAssetModal.findCustomPropertyValue(0).clear();
    editAssetModal.findSaveButton().click();

    cy.wait('@preserveCustomProperty').then((interception) => {
      expect(interception.request.body).not.to.have.property('remove_properties');
      expect(interception.request.body.properties).not.to.have.property('custom-key');
    });
  });

  it('should display schema section and add a column', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: tableResponse },
    ).as('updateTable');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();
    editAssetModal.shouldBeOpen();

    editAssetModal.findSchemaColumnName(0).should('have.value', 'id');
    editAssetModal.findSchemaColumnTypeToggle(0).should('contain.text', 'Integer');
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

  it('should remove custom properties in edit mode', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    cy.intercept(
      'PATCH',
      `${REGISTRY_API}/test-project/namespaces/analytics/generic-tables/claims-data`,
      { body: tableResponse },
    ).as('removeCustomProperty');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();
    editAssetModal.findCustomPropertyRemove(0).click();
    editAssetModal.findSaveButton().click();

    cy.wait('@removeCustomProperty').then((interception) => {
      expect(interception.request.body.remove_properties).to.include('custom-key');
      expect(interception.request.body.properties).not.to.have.property('custom-key');
    });
  });

  it('should close modal on cancel', () => {
    cy.visit('/ai-hub/data/browse/assets/table/test-project/analytics/claims-data');
    cy.wait('@getTable');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();
    editAssetModal.shouldBeOpen();

    editAssetModal.findCancelButton().click();
    editAssetModal.shouldBeOpen(false);
  });
});

describe('Edit Volume Asset', () => {
  const volumeResponse = mockVolumeInfo({
    name: 'training-docs',
    storage_location: 's3://bucket/docs/training',
    description: 'Training document storage',
    labels: ['source-docs'],
    properties: {
      'content-type': 'application/pdf',
      purpose: 'training',
    },
  });

  beforeEach(() => {
    initIntercepts();
    cy.intercept('GET', `${REGISTRY_API}/test-project/namespaces/default/volumes/training-docs`, {
      body: volumeResponse,
    }).as('getVolume');
  });

  it('should open edit modal for volume with pre-populated fields', () => {
    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-docs');
    cy.wait('@getVolume');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();

    editAssetModal.shouldBeOpen();
    editAssetModal.findNameInput().should('have.value', 'training-docs');
    editAssetModal.findDescriptionInput().should('have.value', 'Training document storage');
    editAssetModal.findAssetTypeInput().should('have.value', 'Unstructured');
    editAssetModal.findFormatToggle().should('contain.text', 'Documents');
    editAssetModal.findPurposeInput().should('have.value', 'training');
    editAssetModal.findAddColumnButton().should('not.exist');
  });

  it('should edit volume and save', () => {
    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-docs');
    cy.wait('@getVolume');

    cy.intercept('PATCH', `${REGISTRY_API}/test-project/namespaces/default/volumes/training-docs`, {
      body: volumeResponse,
    }).as('updateVolume');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();
    editAssetModal.shouldBeOpen();

    editAssetModal.findDescriptionInput().clear();
    editAssetModal.findDescriptionInput().type('Updated volume description');
    editAssetModal.findFormatToggle().click();
    editAssetModal.findFormatOption('images').click();
    editAssetModal.findSaveButton().click();

    cy.wait('@updateVolume').then((interception) => {
      expect(interception.request.body).to.have.property(
        'description',
        'Updated volume description',
      );
      expect(interception.request.body).to.have.property('format', 'images');
    });
  });

  it('should preserve the raw content type when only the description changes', () => {
    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-docs');
    cy.wait('@getVolume');

    cy.intercept('PATCH', `${REGISTRY_API}/test-project/namespaces/default/volumes/training-docs`, {
      body: volumeResponse,
    }).as('updateVolume');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();
    editAssetModal.findDescriptionInput().clear();
    editAssetModal.findDescriptionInput().type('Updated volume description');
    editAssetModal.findSaveButton().click();

    cy.wait('@updateVolume').then((interception) => {
      expect(interception.request.body.properties).to.have.property(
        'content-type',
        'application/pdf',
      );
    });
  });

  it('should clear the purpose when it is removed', () => {
    cy.visit('/ai-hub/data/browse/assets/volume/test-project/default/training-docs');
    cy.wait('@getVolume');

    cy.intercept('PATCH', `${REGISTRY_API}/test-project/namespaces/default/volumes/training-docs`, {
      body: volumeResponse,
    }).as('updateVolume');

    assetDetailPage.findActionsToggle().click();
    assetDetailPage.findEditAction().click();
    editAssetModal.findPurposeInput().clear();
    editAssetModal.findSaveButton().click();

    cy.wait('@updateVolume').then((interception) => {
      expect(interception.request.body).to.have.property('purpose', null);
    });
  });
});
