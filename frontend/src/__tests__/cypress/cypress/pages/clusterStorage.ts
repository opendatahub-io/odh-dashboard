import { Modal } from './components/Modal';
import { TableRow } from './components/table';

class ClusterStorageRow extends TableRow {
  shouldHaveStorageTypeValue(name: string) {
    this.find().find(`[data-label=Type]`).contains(name).should('exist');
    return this;
  }

  findConnectedWorkbenches() {
    return this.find().find('[data-label="Connected workbenches"]');
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

  shouldHaveStorageSize(name: string) {
    this.find().siblings().find('[data-label=Size]').contains(name).should('exist');
    return this;
  }
}

class ClusterStorageModal extends Modal {
  constructor(private edit = false) {
    super(edit ? 'Update cluster storage' : 'Add cluster storage');
  }

  findWorkbenchConnectionSelect() {
    return this.find()
      .findByTestId('connect-existing-workbench-group')
      .findByRole('button', { name: 'Typeahead menu toggle', hidden: true });
  }

  findMountField() {
    return this.find().findByTestId('mount-path-folder-value');
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

  private findPVSizeSelectButton() {
    return cy.findByTestId('value-unit-select');
  }

  selectPVSize(name: string) {
    this.findPVSizeSelectButton().click();
    cy.findByRole('menuitem', { name, hidden: true }).click();
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
    return this.find().findByTestId('storage-classes-selector');
  }

  findStorageClassDeprecatedWarning() {
    return this.find().findByTestId('deprecated-storage-warning');
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
}

export const clusterStorage = new ClusterStorage();
export const addClusterStorageModal = new ClusterStorageModal();
export const updateClusterStorageModal = new ClusterStorageModal(true);
