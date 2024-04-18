import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';
import { DeleteModal } from './components/DeleteModal';
import { TableToolbar } from './components/TableToolbar';

class NotebookRow extends TableRow {
  findDisplayedSoftware() {
    return this.find().findByTestId('displayed-software');
  }
}
class NotebookImageSettingsTableToolbar extends TableToolbar {}

class NotebookImageSettings {
  visit(wait = true) {
    cy.visit('/notebookImages');
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
    return appChrome.findNavItem('Notebook images', 'Settings');
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
    return cy.findByTestId('no-result-found-title');
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
    return new NotebookImageSettingsTableToolbar(() => cy.findByTestId('dashboard-table-toolbar'));
  }
}

class TabRow extends TableRow {
  shouldHaveVersionColumn(name: string) {
    this.find().find(`[data-label="Version"]`).contains(name);
    return this;
  }

  findRemoveContentButton() {
    return this.find().findByTestId('remove-displayed-content-button');
  }
}

class NotebookImageDeleteModal extends DeleteModal {
  findAlertMessage() {
    return this.find().findByTestId('delete-model-error-message-alert');
  }
}

class ImportUpdateNotebookImageModal extends Modal {
  constructor(private edit = false) {
    super(`${edit ? 'Update' : 'Import'} notebook image`);
  }

  findSubmitButton() {
    return this.find().findByTestId('modal-submit-button');
  }

  findImageLocationInput() {
    return this.find().findByTestId('byon-image-location-input');
  }

  findNameInput() {
    return this.find().findByTestId('byon-image-name-input');
  }

  findDescriptionInput() {
    return this.find().findByTestId('byon-image-description-input');
  }

  // Software tab
  findSoftwareTab() {
    return this.find().findByTestId('displayed-content-software-tab');
  }

  findAddSoftwareButton() {
    return this.find().findByTestId('add-software-button');
  }

  findSoftwareNameInput() {
    return this.find().findByTestId('Software-name-input');
  }

  findSoftwareVersionInput() {
    return this.find().findByTestId('Software-version-input');
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

  findPackagesNameInput() {
    return this.find().findByTestId('Packages-name-input');
  }

  findPackagesVersionInput() {
    return this.find().findByTestId('Packages-version-input');
  }

  findSoftwareTable() {
    return cy.findByTestId(`displayed-content-table-software`);
  }

  findPackagesTable() {
    return cy.findByTestId(`displayed-content-table-packages`);
  }

  getPackagesRow(name: string) {
    return new TabRow(() =>
      this.findPackagesTable().find(`[data-label=Packages]`).contains(name).parents('tr'),
    );
  }

  getSoftwareRow(name: string) {
    return new TabRow(() =>
      this.findSoftwareTable().find(`[data-label=Software]`).contains(name).parents('tr'),
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
