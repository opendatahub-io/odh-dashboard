import { K8sNameDescriptionField } from '~/__tests__/cypress/cypress/pages/components/subComponents/K8sNameDescriptionField';
import { Contextual } from './components/Contextual';
import { Modal } from './components/Modal';
import { TableRow } from './components/table';

class StorageModal extends Modal {
  constructor() {
    super('Add storage to Test Notebook');
  }

  selectExistingPersistentStorage(name: string) {
    cy.findByTestId('persistent-storage-group')
      .findByRole('button', { name: 'Typeahead menu toggle' })
      .click();
    cy.findByTestId('persistent-storage-group').findByRole('option', { name }).click();
  }

  findSubmitButton() {
    return this.find().findByTestId('attach-storage');
  }

  findWorkbenchRestartAlert() {
    return this.find().findByTestId('notebook-restart-alert');
  }

  findMountField() {
    return this.find().findByTestId('mount-path-folder-value');
  }
}
class WorkbenchPage {
  visit(projectName: string) {
    cy.visitWithLogin(`/projects/${projectName}?section=workbenches`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  private findNotebookTable() {
    return cy.findByTestId('notebook-table');
  }

  findNotebookTableHeaderButton(name: string) {
    return this.findNotebookTable().find('thead').findByRole('button', { name });
  }

  getNotebookRow(name: string) {
    return new NotebookRow(() =>
      this.findNotebookTable().find(`[data-label=Name]`).contains(name).parents('tr'),
    );
  }

  findEmptyState() {
    return cy.findByTestId('empty-state-title');
  }

  findCreateButton() {
    return cy.findByTestId('create-workbench-button');
  }
}

class EnvironmentVariableTypeField extends Contextual<HTMLElement> {
  getKeyValuePair(index: number) {
    return new KeyValuePairField(() => this.find().findAllByTestId('key-value-pair').eq(index));
  }

  private findUploadPipelineInput() {
    return this.find().find('[data-testid="configmap-upload"] input[type="file"]');
  }

  findRemoveEnvironmentVariableButton() {
    return this.find().findByTestId('remove-environment-variable-button');
  }

  uploadConfigYaml(filePath: string) {
    this.findUploadPipelineInput().selectFile([filePath], { force: true });
  }

  findKeyInput() {
    return this.find().findByTestId('key-input');
  }

  findKeyValue() {
    return this.find().findByTestId('value-input');
  }

  selectEnvDataType(name: string) {
    this.find()
      .findByTestId('env-data-type-field')
      .findByRole('button', { name: 'Options menu' })
      .findSelectOption(name)
      .click();
  }

  selectEnvironmentVariableType(name: string) {
    this.find()
      .findByTestId('environment-variable-type-select')
      .findByRole('button', { name: 'Options menu' })
      .findSelectOption(name)
      .click();
  }

  findAnotherKeyValuePairButton() {
    return this.find().findByTestId('another-key-value-pair-button');
  }
}

class KeyValuePairField extends Contextual<HTMLElement> {
  findKeyInput() {
    return this.find().findByTestId('key-input');
  }

  findValueInput() {
    return this.find().findByTestId('value-input');
  }

  findRemoveKeyValuePairButton() {
    return this.find().findByTestId('remove-key-value-pair');
  }
}

class NotebookConfirmModal extends Modal {
  constructor() {
    super('Stop workbench?');
  }

  findStopWorkbenchButton() {
    return this.find().findByTestId('stop-workbench-button');
  }
}

class NotebookDeleteModal extends Modal {
  constructor() {
    super('Delete workbench?');
  }

  findDeleteModal() {
    return cy.get('[data-testid="delete-modal-input"]');
  }

  findDeleteWorkbenchButton() {
    return cy.contains('span.pf-v6-c-button__text', 'Delete workbench');
  }
}

class NotebookImageUpdateModal {
  findUpdateImageButton() {
    return cy.findByTestId('update-latest-version-button');
  }

  findSubmitUpdateImageButton() {
    return cy.findByTestId('submit-update-latest-version');
  }

  findLatestVersionOption() {
    return cy.findByTestId('latest-image');
  }
}

class NotebookRow extends TableRow {
  shouldHaveNotebookImageName(name: string) {
    return this.find().findByTestId('image-display-name').should('contain.text', name);
  }

  findNotebookImageAvailability() {
    return cy.findByTestId('notebook-image-availability');
  }

  shouldHaveClusterStorageTitle() {
    this.findExpansion()
      .findByTestId('notebook-storage-bar-title')
      .should('have.text', 'Cluster storage');
    return this;
  }

  shouldHaveMountPath(name: string) {
    this.findExpansion().findByTestId('storage-mount-path').contains(name);
    return this;
  }

  findExpansionButton() {
    return this.find().findByTestId('notebook-table-expand-cell');
  }

  findExpansion() {
    return this.find().siblings();
  }

  findAddStorageButton() {
    return this.find()
      .siblings()
      .find(`[data-label="Workbench storages"]`)
      .findByTestId('add-storage-button');
  }

  shouldHaveContainerSize(name: string) {
    this.find().find(`[data-label="Container size"]`).contains(name).should('exist');
    return this;
  }

  findProjectScopedLabel() {
    return this.find().findByTestId('project-scoped-label');
  }

  findNotebookRouteLink() {
    return this.find().findByTestId('notebook-route-link');
  }

  findHaveNotebookStatusText(timeout = 10000) {
    return this.find().findByTestId('notebook-status-text', { timeout });
  }

  expectStatusLabelToBe(statusValue: string, timeout?: number) {
    this.findHaveNotebookStatusText(timeout).should('have.text', statusValue);
  }

  findNotebookStart() {
    return this.find().findByTestId('notebook-start-action');
  }

  findNotebookStop() {
    return this.find().findByTestId('notebook-stop-action');
  }

  findNotebookStatusModal() {
    return cy.findByTestId('notebook-status-modal');
  }

  findNotebookDescription(name: string) {
    return this.find().findByTestId('table-row-title-description').contains(name);
  }

  findNotebookImageLabel() {
    return this.find().findByTestId('notebook-image-availability');
  }
}

class AttachExistingStorageModal extends Modal {
  constructor() {
    super('Attach Existing Storage');
  }

  selectExistingPersistentStorage(name: string) {
    cy.findByTestId('persistent-storage-group')
      .findByPlaceholderText('Select a persistent storage')
      .click();
    cy.findByTestId('persistent-storage-typeahead').contains(name).click();
  }

  verifyPSDropdownIsDisabled(): void {
    cy.get('[data-testid="persistent-storage-group"] .pf-v6-c-menu-toggle')
      .should('have.class', 'pf-m-disabled')
      .and('have.attr', 'disabled');
  }

  verifyPSDropdownText(expectedText: string): void {
    cy.get('[data-testid="persistent-storage-group"] .pf-v6-c-text-input-group__text-input').should(
      'have.value',
      expectedText,
    );
  }

  findStandardPathInput() {
    return cy.findByTestId('mount-path-folder-value');
  }

  findAttachButton() {
    return cy.findByTestId('modal-submit-button');
  }
}

class AttachConnectionModal extends Modal {
  constructor() {
    super('Attach existing connections');
  }

  selectConnectionOption(name: string) {
    this.find().findByRole('button', { name: 'Connections' }).findSelectOption(name).click();
    this.find().findByRole('button', { name: 'Connections' }).click();
  }

  findAttachButton() {
    return this.find().findByTestId('attach-button');
  }
}

class StorageTableRow extends TableRow {
  private findByDataLabel(label: string) {
    return this.find().find(`[data-label="${label}"]`);
  }

  findNameValue() {
    return this.findByDataLabel('Name');
  }

  findStorageSizeValue() {
    return this.findByDataLabel('Storage size');
  }

  findMountPathValue() {
    return this.findByDataLabel('Mount path');
  }
}

class StorageTable {
  find() {
    return cy.findByTestId('cluster-storage-table');
  }

  getRowById(id: number) {
    return new StorageTableRow(
      () =>
        this.find().findByTestId(['cluster-storage-table-row', id]) as unknown as Cypress.Chainable<
          JQuery<HTMLTableRowElement>
        >,
    );
  }
}

class NotebookImageGroup extends Contextual<HTMLElement> {}
class CreateSpawnerPage {
  k8sNameDescription = new K8sNameDescriptionField('workbench');

  shouldHaveAppTitle() {
    cy.findByTestId('app-page-title').should('have.text', 'Create workbench');
    return this;
  }

  getStorageTable() {
    return new StorageTable();
  }

  getNameInput() {
    return cy.findByTestId('workbench-name');
  }

  getEditResourceLink() {
    return cy.findByTestId('workbench-editResourceLink');
  }

  getResourceInput() {
    return cy.findByTestId('workbench-resourceName');
  }

  getDescriptionInput() {
    return cy.findByTestId('workbench-description');
  }

  private findPVSizeField() {
    return cy.findByTestId('create-new-storage-size');
  }

  private findPVSizeSelectButton() {
    return cy.findByTestId('value-unit-select');
  }

  findAttachExistingStorageButton() {
    return cy.findByTestId('existing-storage-button');
  }

  selectPVSize(name: string) {
    this.findPVSizeSelectButton().click();
    cy.findByRole('menuitem', { name }).click();
  }

  findPVSizeMinusButton() {
    return this.findPVSizeField().findByRole('button', { name: 'Minus' });
  }

  findPVSizeInput() {
    return this.findPVSizeField().find('input');
  }

  findPVSizePlusButton() {
    return this.findPVSizeField().findByRole('button', { name: 'Plus' });
  }

  findClusterStorageDescriptionInput() {
    return cy.findByTestId('create-new-storage-description');
  }

  findSubmitButton() {
    return cy.findByTestId('submit-button');
  }

  findCancelButton() {
    return cy.findByTestId('cancel-button');
  }

  findSideBarItems(section: string) {
    return cy.findByTestId(`${section}-jump-link`).find('a');
  }

  getEnvironmentVariableTypeField(index: number) {
    return new EnvironmentVariableTypeField(() =>
      cy.findAllByTestId('environment-variable-field').eq(index),
    );
  }

  findAcceleratorProfileSearchSelector() {
    return cy.findByTestId('accelerator-profile-selection-toggle');
  }

  getGlobalAcceleratorProfileLabel(): Cypress.Chainable<JQuery<HTMLBodyElement>> {
    return cy.get('body').contains('Global accelerator profiles');
  }

  getProjectScopedAcceleratorProfileLabel(): Cypress.Chainable<JQuery<HTMLBodyElement>> {
    return cy.get('body').contains('Project-scoped accelerator profiles');
  }

  findAcceleratorProfile(name: string) {
    return cy.findByRole('menuitem', {
      name,
      hidden: true,
    });
  }

  findNotebookImageSelector() {
    return cy.findByTestId('workbench-image-stream-selection');
  }

  findNotebookImage(name: string) {
    return this.findNotebookImageSelector().findDropdownItemByTestId(name).scrollIntoView();
  }

  findNotebookImageSearchSelector() {
    return cy.findByTestId('image-stream-selector-toggle');
  }

  findNotebookImageSearchInput() {
    return cy.findByTestId('image-stream-selector-search').find('input');
  }

  getGlobalImagesLabel() {
    return cy.get('body').contains('Global images');
  }

  getProjectScopedImagesLabel() {
    return cy.get('body').contains('Project-scoped images');
  }

  findProjectScopedLabel() {
    return cy.findByTestId('project-scoped-label');
  }

  findGlobalScopedLabel() {
    return cy.findByTestId('global-scoped-label');
  }

  getProjectScopedNotebookImages() {
    return new NotebookImageGroup(() => cy.findByTestId('project-scoped-notebook-images'));
  }

  getGlobalScopedNotebookImages() {
    return new NotebookImageGroup(() => cy.findByTestId('global-scoped-notebook-images'));
  }

  findNotebookVersion(version: string): Cypress.Chainable<JQuery<HTMLElement>> {
    cy.findByTestId('workbench-image-version-selection').click();
    return cy.get(`[data-testid$="-${version}"]`).click();
  }

  selectContainerSize(name: string) {
    cy.findByTestId('container-size-group')
      .findByRole('button', { name: 'Options menu' })
      .findSelectOption(name)
      .click();
  }

  shouldHaveClusterStorageAlert() {
    cy.findByTestId('cluster-storage-alert').should('exist');
    return this;
  }

  findAddVariableButton() {
    return cy.findByTestId('add-variable-button');
  }

  findContainerSizeInput(name: string) {
    return cy.findByTestId('container-size-group').contains(name);
  }

  findAttachConnectionButton() {
    return cy.findByTestId('attach-existing-connection-button');
  }

  findConnectionsTable() {
    return cy.findByTestId('connections-table');
  }

  findConnectionsTableRow(name: string, type: string) {
    this.findConnectionsTable().find(`[data-label=Name]`).contains(name);
    this.findConnectionsTable().find(`[data-label=Type]`).contains(type);
  }
}

class EditSpawnerPage extends CreateSpawnerPage {
  visit(notebookName: string) {
    cy.visitWithLogin(`/projects/test-project/spawner/${notebookName}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('have.text', 'Edit Test Notebook');
    cy.testA11y();
  }

  shouldHaveNotebookImageSelectInput(name: string) {
    cy.findByTestId('workbench-image-stream-selection').contains(name).should('exist');
    return this;
  }

  shouldHaveContainerSizeInput(name: string) {
    cy.findByTestId('container-size-group').contains(name).should('exist');
    return this;
  }

  findAlertMessage() {
    return cy.findByTestId('env-variable-alert-message');
  }

  findCancelButton() {
    return cy.findByTestId('workbench-cancel-button');
  }

  findAcceleratorProfileSelect() {
    return cy.findByTestId('accelerator-profile-select');
  }
}

class NotFoundSpawnerPage {
  visit(notebookName: string) {
    cy.visitWithLogin(`/projects/test-project/spawner/${notebookName}`);
    this.wait();
  }

  private wait() {
    this.findReturnToPage();
    cy.testA11y();
  }

  shouldHaveErrorMessageTitle(name: string) {
    cy.findByTestId('error-message-title').should('contain.text', name);
    return this;
  }

  findReturnToPage() {
    return cy.findByTestId('return-to-project-button');
  }
}

class WorkbenchStatusModal extends Modal {
  constructor() {
    super('Workbench status');
  }

  findProgressTab() {
    return cy.findByTestId('expand-progress');
  }

  findProgressSteps() {
    return cy.findByTestId('notebook-startup-steps').find('[data-testid^="step-status-"]');
  }

  getStepTitle($step: JQuery<HTMLElement>) {
    return cy.wrap($step).find('[id$="-title"]').invoke('text');
  }

  assertStepSuccess($step: JQuery<HTMLElement>) {
    return cy
      .wrap($step)
      .should('have.attr', 'data-testid')
      .and('match', /^step-status-Success/);
  }

  findEventlogTab() {
    return cy.findByTestId('expand-logs');
  }

  findLogEntry(text: string) {
    return cy.get('ul[data-id="event-logs"]').find('li span').contains(text);
  }

  getNotebookStatus(expectedStatus: string, timeout?: number) {
    return cy
      .get(
        '[data-testid="notebook-status-text"]',
        // Only pass timeout if it's explicitly provided
        timeout !== undefined ? { timeout } : {},
      )
      .should('contain.text', expectedStatus);
  }

  findStopWorkbenchFooterButton() {
    return cy.get('[data-id="close-spawn"]');
  }

  findEditWorkbenchFooterButton() {
    return cy.get('[data-id="edit-workbench"]');
  }

  findStartWorkbenchFooterButton() {
    return cy.get('[data-id="start-spawn"]');
  }

  findStopWorkbenchButton() {
    return cy.findByTestId('stop-workbench-button');
  }

  findStartWorkbenchButton() {
    return cy.findByTestId('start-workbench-button');
  }

  getModalCloseButton() {
    return cy.get('[aria-label="Close"]');
  }
}

export const workbenchPage = new WorkbenchPage();
export const createSpawnerPage = new CreateSpawnerPage();
export const notebookConfirmModal = new NotebookConfirmModal();
export const notebookDeleteModal = new NotebookDeleteModal();
export const editSpawnerPage = new EditSpawnerPage();
export const storageModal = new StorageModal();
export const notFoundSpawnerPage = new NotFoundSpawnerPage();
export const attachConnectionModal = new AttachConnectionModal();
export const attachExistingStorageModal = new AttachExistingStorageModal();
export const workbenchStatusModal = new WorkbenchStatusModal();
export const notebookImageUpdateModal = new NotebookImageUpdateModal();
