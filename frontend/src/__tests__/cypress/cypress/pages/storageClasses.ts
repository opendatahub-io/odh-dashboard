import type { MockStorageClass } from '~/__mocks__';
import { mockStorageClassList } from '~/__mocks__';
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';
import { Modal } from './components/Modal';

class StorageClassesPage {
  visit() {
    cy.visitWithLogin('/storageClasses');
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').contains('Storage classes');
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem('Storage classes', 'Settings');
  }

  findEmptyState() {
    return cy.findByTestId('storage-classes-empty-state');
  }
}

class StorageClassesTableRow extends TableRow {
  findOpenshiftDefaultLabel() {
    return this.find().findByTestId('openshift-sc-default-label');
  }

  findEnableSwitchInput() {
    return this.find().findByTestId('enable-switch');
  }

  findDefaultRadioInput() {
    return this.find().findByTestId('set-default-radio');
  }

  findDisplayNameValue() {
    return this.find().find(`[data-label="Display name"]`);
  }

  findEnableValue() {
    return this.find().find(`[data-label="Enable"]`);
  }

  findDefaultValue() {
    return this.find().find(`[data-label="Default"]`);
  }

  findLastModifiedValue() {
    return this.find().find(`[data-label="Last modified"]`);
  }

  findCorruptedMetadataAlert() {
    return cy.findByTestId('corrupted-metadata-alert');
  }
}

class StorageClassesTable {
  find() {
    return cy.findByTestId('storage-classes-table');
  }

  getRowByName(name: string) {
    return new StorageClassesTableRow(() =>
      this.find().find(`[data-label="Openshift storage class"]`).contains(name).parents('tr'),
    );
  }

  getRowByConfigName(name: string) {
    return new StorageClassesTableRow(() =>
      this.find().find(`[data-label="Display name"]`).contains(name).parents('tr'),
    );
  }

  findRowByName(name: string) {
    return this.getRowByConfigName(name).find();
  }

  mockUpdateStorageClass(storageClassName: string, times?: number) {
    return cy.interceptOdh(
      `PUT /api/storage-class/:name/config`,
      { path: { name: storageClassName }, times },
      { success: true, error: '' },
    );
  }

  mockGetStorageClasses(storageClasses: MockStorageClass[], times?: number) {
    return cy.interceptOdh(
      'GET /api/k8s/apis/storage.k8s.io/v1/storageclasses',
      { times },
      mockStorageClassList(storageClasses),
    );
  }
}

class StorageClassEditModal extends Modal {
  constructor() {
    super('Edit storage class details');
  }

  find() {
    return cy.findByTestId('edit-sc-modal').parents('div[role="dialog"]');
  }

  findOpenshiftScName() {
    return this.find().findByTestId('edit-sc-openshift-class-name');
  }

  findOpenshiftDefaultLabel() {
    return this.findOpenshiftScName().findByTestId('openshift-sc-default-label');
  }

  findProvisioner() {
    return this.find().findByTestId('edit-sc-provisioner');
  }

  findDisplayNameInput() {
    return this.find().findByTestId('edit-sc-display-name');
  }

  fillDisplayNameInput(value: string) {
    this.findDisplayNameInput().clear().fill(value);
  }

  findDescriptionInput() {
    return this.find().findByTestId('edit-sc-description');
  }

  fillDescriptionInput(value: string) {
    this.findDescriptionInput().clear().fill(value);
  }

  findCloseButton() {
    return this.findFooter().findByTestId('modal-cancel-button');
  }

  findSaveButton() {
    return this.findFooter().findByTestId('modal-submit-button');
  }

  findInfoAlert() {
    return this.find().findByTestId('edit-sc-modal-info-alert');
  }

  mockUpdateStorageClass(storageClassName: string, times?: number) {
    return cy.interceptOdh(
      `PUT /api/storage-class/:name/config`,
      { path: { name: storageClassName }, times },
      { success: true, error: '' },
    );
  }
}

export const storageClassesPage = new StorageClassesPage();
export const storageClassesTable = new StorageClassesTable();
export const storageClassEditModal = new StorageClassEditModal();
