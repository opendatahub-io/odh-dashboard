import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import { Modal } from '#~/__tests__/cypress/cypress/pages/components/Modal';
import { TableRow } from '#~/__tests__/cypress/cypress/pages/components/table';
import { K8sNameDescriptionField } from '#~/__tests__/cypress/cypress/pages/components/subComponents/K8sNameDescriptionField';
import { DeleteModal } from './components/DeleteModal';
import { Contextual } from './components/Contextual';

class NotebookRow extends TableRow {
  findDisplayedSoftware() {
    return this.find().findByTestId('displayed-software');
  }
}
class NotebookImageSettingsTableToolbar extends Contextual<HTMLElement> {
  findToggleButton(id: string) {
    return this.find().pfSwitch(id).click();
  }

  findFilterMenuOption(id: string, name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToggleButton(id).parents().findByRole('menuitem', { name });
  }

  findSearchInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('filter-toolbar-text-field');
  }
}

class NotebookImageSettings {
  visit(wait = true) {
    cy.visitWithLogin('/workbenchImages');
    if (wait) {
      this.wait();
    }
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  private wait() {
    this.findImportImageButton();
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem('Workbench images', 'Settings');
  }

  findErrorIcon() {
    return cy.findByRole('button', { name: 'error icon' });
  }

  findImportImageButton() {
    return cy.findByTestId('import-new-image');
  }

  findErrorButton() {
    return cy.findByRole('button', { name: 'error icon' });
  }

  findEmptyResults() {
    return cy.findByTestId('dashboard-empty-table-state');
  }

  private findTable() {
    return cy.findByTestId('notebook-images-table');
  }

  findTableHeaderButton(name: string) {
    return this.findTable().find('thead').findByRole('button', { name });
  }

  getRow(name: string) {
    return new NotebookRow(() =>
      this.findTable().find('[data-label=Name]').contains(name).parents('tr'),
    );
  }

  getTableToolbar() {
    return new NotebookImageSettingsTableToolbar(() => cy.findByTestId('byonImages-table-toolbar'));
  }
}

class TabRow extends TableRow {
  shouldHaveVersionColumn(name: string) {
    this.find().find(`[data-label="Version"]`).find('input').should('have.value', name);
    return this;
  }

  findRemoveContentButton(index: number) {
    return this.find().findByTestId(`remove-displayed-content-button-${index}`);
  }
}

class NotebookImageDeleteModal extends DeleteModal {
  findAlertMessage() {
    return this.find().findByTestId('delete-model-error-message-alert');
  }
}

class ImportUpdateNotebookImageModal extends Modal {
  k8sNameDescription = new K8sNameDescriptionField('byon-image');

  constructor(private edit = false) {
    super(`${edit ? 'Update' : 'Import'} workbench image`);
  }

  findSubmitButton() {
    return this.find().findByTestId('modal-submit-button');
  }

  findImageLocationInput() {
    return this.find().findByTestId('byon-image-location-input');
  }

  findNameInput() {
    return this.k8sNameDescription.findDisplayNameInput();
  }

  findDescriptionInput() {
    return this.k8sNameDescription.findDescriptionInput();
  }

  findHardwareProfileSelect() {
    return this.find().findByTestId('hardware-profile-identifier-multiselect');
  }

  findHardwareProfileSelectOptionValues() {
    return cy
      .findAllByRole('option')
      .then((options) => [...options].map((option) => option.textContent.trim()));
  }

  findHardwareProfileSelectOption(option: string) {
    return cy.findByRole('option', { name: option, hidden: true });
  }

  // Software tab
  findSoftwareTab() {
    return this.find().findByTestId('displayed-content-software-tab');
  }

  findAddSoftwareButton() {
    return this.find().findByTestId('add-software-button');
  }

  findSoftwareNameInput(index: number) {
    return this.find().findByTestId(`Software-name-input-${index}`);
  }

  findSoftwareVersionInput(index: number) {
    return this.find().findByTestId(`Software-version-input-${index}`);
  }

  findErrorMessageAlert() {
    return this.find().findByTestId('error-message-alert');
  }

  // Packages tab
  findPackagesTab() {
    return this.find().findByTestId('displayed-content-packages-tab');
  }

  findAddPackagesButton() {
    return this.find().findByTestId('add-packages-button');
  }

  findPackagesNameInput(index: number) {
    return this.find().findByTestId(`Packages-name-input-${index}`);
  }

  findPackagesVersionInput(index: number) {
    return this.find().findByTestId(`Packages-version-input-${index}`);
  }

  findSoftwareTable() {
    return cy.findByTestId(`displayed-content-table-software`);
  }

  findPackagesTable() {
    return cy.findByTestId(`displayed-content-table-packages`);
  }

  getPackagesRow(name: string, index: number) {
    return new TabRow(() =>
      this.findPackagesTable()
        .find(`[data-label=Packages]`)
        .eq(index)
        .find('input')
        .should('have.value', name)
        .parents('tr'),
    );
  }

  getSoftwareRow(name: string, index: number) {
    return new TabRow(() =>
      this.findSoftwareTable()
        .find(`[data-label=Software]`)
        .eq(index)
        .find('input')
        .should('have.value', name)
        .parents('tr'),
    );
  }

  findSoftwareRows() {
    return this.findSoftwareTable().find(`[data-label=Software]`);
  }

  findPackagesRows() {
    return this.findPackagesTable().find(`[data-label=Packages]`);
  }

  // Software / Packages management
  findAddSoftwareResourceButton() {
    return this.find().findByTestId('add-software-resource-button');
  }

  findAddPackagesResourceButton() {
    return this.find().findByTestId('add-packages-resource-button');
  }

  findSaveResourceButton(name: string) {
    return this.find().findByTestId(`save-displayed-button-${name}`);
  }

  findDiscardResourceButton(name: string) {
    return this.find().findByTestId(`discard-display-button-${name}`);
  }
}

export const notebookImageSettings = new NotebookImageSettings();
export const importNotebookImageModal = new ImportUpdateNotebookImageModal();
export const updateNotebookImageModal = new ImportUpdateNotebookImageModal(true);
export const notebookImageDeleteModal = new NotebookImageDeleteModal();
