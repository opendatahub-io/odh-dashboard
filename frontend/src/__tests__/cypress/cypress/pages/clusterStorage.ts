import type { AccessMode } from '#~/__tests__/cypress/cypress/types';
import { Modal } from './components/Modal';
import { TableRow } from './components/table';

class ClusterStorageRow extends TableRow {
  shouldHaveStorageTypeValue(name: string) {
    this.find().find(`[data-label=Type]`).contains(name).should('exist');
    return this;
  }

  findConnectedWorkbenches() {
    return this.find().find('[data-label="Workbench connections"]');
  }

  toggleExpandableContent() {
    this.find().findByRole('button', { name: 'Details' }).click();
  }

  findDeprecatedLabel() {
    return this.find().findByTestId('storage-class-deprecated');
  }

  queryDeprecatedLabel() {
    return this.find().get('[data-testid="storage-class-deprecated"]');
  }

  shouldHaveDeprecatedTooltip() {
    cy.findByTestId('storage-class-deprecated-tooltip').should('be.visible');
    return this;
  }

  findStorageClassColumn() {
    return this.find().find('[data-label="Storage class"]');
  }

  findSizeColumn() {
    return this.find().find('[data-label="Storage size"]');
  }

  showStorageClassDetails() {
    return this.findStorageClassColumn().findByTestId('resource-name-icon-button').click();
  }

  findStorageClassResourceNameText() {
    return cy.findByTestId('resource-name-text');
  }

  findStorageClassResourceKindText() {
    return cy.findByTestId('resource-kind-text');
  }

  findStorageSizeWarning() {
    return cy.findByTestId('size-warning-popover').click();
  }

  findStorageSizeWarningText() {
    return cy
      .findByTestId('size-warning-popover-text')
      .should(
        'have.text',
        'To complete the storage size update, you must connect and run a workbench.',
      );
  }
}

class SelectStorageClass {
  find() {
    return cy.findByTestId('storage-classes-selector');
  }

  selectStorageClassSelectOption(name: string | RegExp) {
    cy.findByRole('option', { name, hidden: true }).click();
  }

  findSelectStorageClassLabel(name: string | RegExp, accessMode: AccessMode) {
    return cy.findByRole('option', { name, hidden: true }).findByTestId(`${accessMode}-label`);
  }
}

class ClusterStorageModal extends Modal {
  constructor(private edit = false) {
    super(edit ? 'Update cluster storage' : 'Add cluster storage');
  }

  findAddWorkbenchButton() {
    return cy.findByTestId('add-workbench-button');
  }

  findWorkbenchTable() {
    return cy.findByTestId('workbench-connection-table');
  }

  selectWorkbenchName(row: number, name: string) {
    this.findWorkbenchSelect(row).click();
    cy.findByRole('option', { name, hidden: true }).click();
  }

  findWorkbenchSelect(row: number) {
    return this.findWorkbenchTable()
      .find(`[data-label=Name]`)
      .eq(row)
      .findByTestId('cluster-storage-workbench-select');
  }

  findWorkbenchName(row: number) {
    return this.findWorkbenchTable()
      .find(`[data-label=Name]`)
      .eq(row)
      .findByTestId('typeahead-menu-toggle');
  }

  findWorkbenchSelectValueField(row: number) {
    return this.findWorkbenchName(row).findByRole('combobox', {
      name: 'Type to filter',
    });
  }

  selectCustomPathFormat(row: number) {
    this.findWorkbenchTable().find(`[data-label="Path format"]`).eq(row).find('button').click();
    cy.findByRole('option', {
      name: 'Custom Custom paths that do not begin with /opt/app-root/src/ are not visible in the JupyterLab file browser.',
      hidden: true,
    }).click();
  }

  findMountPathField(row: number) {
    return this.findWorkbenchTable().find(`[data-label="Mount path"]`).eq(row).find('input');
  }

  findMountFieldHelperText() {
    return this.find().findByTestId('mount-path-folder-helper-text');
  }

  findWorkbenchRestartAlert() {
    return this.find().findByTestId('notebook-restart-alert');
  }

  findNameInput() {
    return this.find().findByTestId('create-new-storage-name');
  }

  findDescriptionInput() {
    return this.find().findByTestId('create-new-storage-description');
  }

  findSubmitButton() {
    return this.find().findByTestId('modal-submit-button');
  }

  findPVStorageSizeValue() {
    return this.find().find('[aria-label="Input"]');
  }

  private findPVSizeSelectButton() {
    return this.find().findByTestId('value-unit-select');
  }

  selectPVSize(name: string) {
    this.findPVSizeSelectButton().findDropdownItem(name).click();
    return this;
  }

  shouldHavePVSizeSelectValue(name: string) {
    this.findPVSizeSelectButton().contains(name).should('exist');
    return this.findPVSizeSelectButton();
  }

  private findPVSizeField() {
    return this.find().findByTestId('create-new-storage-size');
  }

  findPVSizeMinusButton() {
    return this.findPVSizeField().findByRole('button', { name: 'Minus', hidden: true });
  }

  findPersistentStorageWarningCanNotEdit() {
    return this.find().findByTestId('persistent-storage-warning-can-not-edit');
  }

  findPersistentStorageWarningCanOnlyIncrease() {
    return this.find().findByTestId('persistent-storage-warning-can-only-increase');
  }

  findPVSizeInput() {
    return this.findPVSizeField().find('input');
  }

  findPVSizePlusButton() {
    return this.findPVSizeField().findByRole('button', { name: 'Plus', hidden: true });
  }

  findStorageClassSelect() {
    return new SelectStorageClass();
  }

  findStorageClassDeprecatedWarning() {
    return this.find().findByTestId('deprecated-storage-warning');
  }

  findRWOAccessMode() {
    return this.find().findByTestId('ReadWriteOnce-radio');
  }

  findRWXAccessMode() {
    return this.find().findByTestId('ReadWriteMany-radio');
  }

  findROXAccessMode() {
    return this.find().findByTestId('ReadOnlyMany-radio');
  }

  findRWOPAccessMode() {
    return this.find().findByTestId('ReadWriteOncePod-radio');
  }

  findExistingAccessMode() {
    return this.find().findByTestId('existing-access-mode');
  }
}

class ClusterStorage {
  visit(projectName: string) {
    cy.visitWithLogin(`/projects/${projectName}?section=cluster-storages`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findEmptyState() {
    return cy.findByTestId('empty-state-title');
  }

  private findClusterStorageTable() {
    return cy.findByTestId('storage-table');
  }

  findClusterStorageTableHeaderButton(name: string) {
    return this.findClusterStorageTable().find('thead').findByRole('button', { name });
  }

  shouldHaveDeprecatedAlertMessage() {
    return cy
      .findByTestId('storage-class-deprecated-alert')
      .should(
        'contain.text',
        'Warning alert:Deprecated storage classOne or more storage classes have been deprecated by your administrator, but the cluster storage instances using them remain active. If you want to migrate your data to a cluster storage instance using a different storage class, contact your administrator.',
      );
  }

  shouldNotHaveDeprecatedAlertMessage() {
    return cy.get('[date-testid="storage-class-deprecated-alert"]').should('not.exist');
  }

  closeDeprecatedAlert() {
    cy.findByTestId('storage-class-deprecated-alert-close-button').click();
  }

  getClusterStorageRow(name: string) {
    return new ClusterStorageRow(() =>
      this.findClusterStorageTable().find(`[data-label=Name]`).contains(name).parents('tr'),
    );
  }

  findCreateButton() {
    return cy.findByTestId('cluster-storage-button');
  }

  findCreateButtonFromActions() {
    return cy.findByTestId('actions-cluster-storage-button');
  }

  findKebabToggle() {
    return cy.get('button[aria-label="Kebab toggle"]');
  }
}

export const clusterStorage = new ClusterStorage();
export const addClusterStorageModal = new ClusterStorageModal();
export const updateClusterStorageModal = new ClusterStorageModal(true);
