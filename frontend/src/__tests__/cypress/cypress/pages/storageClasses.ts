import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import { TableRow } from '#~/__tests__/cypress/cypress/pages/components/table';
import { mockStorageClassList } from '#~/__mocks__';
import type { StorageClassKind } from '#~/k8sTypes';
import { StorageClassModel } from '#~/__tests__/cypress/cypress/utils/models';
import { TableToolbar } from './components/TableToolbar';
import { Modal } from './components/Modal';

class StorageClassesPage {
  visit() {
    cy.visitWithLogin('/storageClasses');
    this.wait();
  }

  navigate() {
    this.findNavItem().click();
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

  findNoDefaultAlert() {
    return cy.findByTestId('no-default-storage-class-alert');
  }

  mockGetStorageClasses(storageClasses?: StorageClassKind[], times?: number) {
    return cy.interceptK8sList(
      {
        model: StorageClassModel,
        times,
      },
      mockStorageClassList(storageClasses),
    );
  }
}

class StorageClassesToolbar extends TableToolbar {
  findFilterMenu() {
    return this.find().findByTestId('filter-toolbar-dropdown');
  }

  findFilterMenuItem(name: string) {
    this.findFilterMenu().click();
    return this.findFilterMenu().get('button').contains(name);
  }

  fillSearchInput(value: string) {
    this.findSearchInput().clear().fill(value);
  }
}

class StorageClassesTableRow extends TableRow {
  private findByDataLabel(label: string) {
    return this.find().find(`[data-label="${label}"]`);
  }

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
    return this.findByDataLabel('Display name');
  }

  findEnableValue() {
    return this.findByDataLabel('Enable');
  }

  findDefaultValue() {
    return this.findByDataLabel('Default');
  }

  findLastModifiedValue() {
    return this.findByDataLabel('Last modified');
  }

  findCorruptedMetadataAlert() {
    return cy.findByTestId('corrupted-metadata-alert');
  }

  shouldContainAccessModeLabels(labels: string[]) {
    return this.find()
      .findByTestId('access-mode-label-group')
      .within(() => labels.map((label) => cy.contains(label)));
  }
}

class StorageClassesTable {
  private findByDataLabel(label: string) {
    return this.find().find(`[data-label="${label}"]`);
  }

  find() {
    return cy.findByTestId('storage-classes-table');
  }

  getRowByName(name: string, label = 'OpenShift storage class') {
    return new StorageClassesTableRow(() =>
      this.findByDataLabel(label).contains(name).parents('tr'),
    );
  }

  getRowByConfigName(name: string) {
    return this.getRowByName(name, 'Display name');
  }

  getTableToolbar() {
    return new StorageClassesToolbar(() => cy.findByTestId('sc-table-toolbar'));
  }

  findRowByName(name: string) {
    return this.getRowByConfigName(name).find();
  }

  findRows() {
    return this.findByDataLabel('Display name').parents('tr');
  }

  findEmptyState() {
    return cy.findByTestId('dashboard-empty-table-state');
  }

  findClearFiltersButton() {
    return this.findEmptyState().findByTestId('clear-filters-button');
  }

  mockGetStorageClass(storageClass: StorageClassKind, times = 1) {
    return cy.interceptK8s('GET', { model: StorageClassModel, times }, storageClass);
  }

  mockPatchStorageClass(storageClass: StorageClassKind, times = 1) {
    return cy.interceptK8s('PATCH', { model: StorageClassModel, times }, storageClass);
  }
}

class StorageClassEditModal extends Modal {
  constructor() {
    super('Edit storage class details');
  }

  find() {
    return cy.findByTestId('edit-sc-modal');
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

  findAccessModeCheckbox(mode: string) {
    //mode: rwo, rwx, rox, rwop
    return this.find().findByTestId(`edit-sc-access-mode-checkbox-${mode.toLowerCase()}`);
  }

  findAccessModeAlert() {
    return this.find().findByTestId('edit-sc-access-mode-alert');
  }

  mockGetStorageClass(storageClass: StorageClassKind, times = 1) {
    return cy.interceptK8s('GET', { model: StorageClassModel, times }, storageClass);
  }

  mockPatchStorageClass(storageClass: StorageClassKind, times = 1) {
    return cy.interceptK8s('PATCH', { model: StorageClassModel, times }, storageClass);
  }
}

export const storageClassesPage = new StorageClassesPage();
export const storageClassesTable = new StorageClassesTable();
export const storageClassEditModal = new StorageClassEditModal();
