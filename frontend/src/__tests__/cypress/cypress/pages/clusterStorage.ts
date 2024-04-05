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
      .findByRole('button', { name: 'Options menu' });
  }

  findMountField() {
    return this.find().findByTestId('mount-path-folder-value');
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
    cy.findByRole('menuitem', { name }).click();
  }

  shouldHavePVSizeSelectValue(name: string) {
    this.findPVSizeSelectButton().findByRole('button', { name }).should('exist');
    return this;
  }

  private findPVSizeField() {
    return this.find().findByTestId('create-new-storage-size');
  }

  findPVSizeMinusButton() {
    return this.findPVSizeField().findByRole('button', { name: 'Minus' });
  }

  findPersistentStorageWarning() {
    return this.find().findByTestId('persistent-storage-warning');
  }

  findPVSizeInput() {
    return this.findPVSizeField().find('input');
  }

  findPVSizePlusButton() {
    return this.findPVSizeField().findByRole('button', { name: 'Plus' });
  }
}

class ClusterStorage {
  visit(projectName: string) {
    cy.visit(`/projects/${projectName}?section=cluster-storages`);
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

  getClusterStorageRow(name: string) {
    return new ClusterStorageRow(() =>
      this.findClusterStorageTable().find(`[data-label=Name]`).contains(name).parents('tr'),
    );
  }

  findCreateButton() {
    return cy.findByTestId('cluster-storage-button');
  }
}

export const clusterStorage = new ClusterStorage();
export const addClusterStorageModal = new ClusterStorageModal();
export const updateClusterStorageModal = new ClusterStorageModal(true);
