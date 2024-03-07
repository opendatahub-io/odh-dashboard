import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';

class NotebookRow extends TableRow {}

class NotebookImageSettings {
  visit() {
    cy.visitWithLogin('/notebookImages');
    this.wait();
  }

  navigate() {
    appChrome.findNavItem('Notebook images', 'Settings').click();
    this.wait();
  }

  private wait() {
    cy.findByRole('button', { name: 'Import new image' });
    cy.testA11y();
  }

  findImportImageButton() {
    return cy.findByRole('button', { name: 'Import new image' });
  }

  // table tool bar
  findFilterMenuOption(itemLabel: string) {
    cy.findByTestId('filter-dropdown-select').click();
    return cy.findByRole('menuitem', { name: itemLabel });
  }

  findSearchInput() {
    return cy.findByRole('textbox', { name: 'Search input' });
  }

  findResetButton() {
    return cy.findByRole('button', { name: 'Reset' });
  }

  findEmptyResults() {
    return cy.findByRole('heading', { name: 'No results found' });
  }

  private findTable() {
    return cy.findByRole('grid', { name: /Notebook images table/ });
  }

  findTableHeaderButton(name: string) {
    return this.findTable().find('thead').findByRole('button', { name });
  }

  getRow(name: string) {
    return new NotebookRow(() =>
      this.findTable().find('[data-label=Name]').contains(name).parents('tr'),
    );
  }
}

class ImportUpdateNotebookImageModal extends Modal {
  constructor(private edit = false) {
    super(`${edit ? 'Update' : 'Import'} notebook image`);
  }

  findSubmitButton() {
    return this.find().findByRole('button', { name: this.edit ? 'Update' : 'Import' });
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
    return this.find().findByRole('tab', { name: 'Displayed content software tab' }).click();
  }

  findAddSoftwareButton() {
    return this.find().findByTestId('add-software-button');
  }

  findSoftwareNameInput() {
    return this.find().findByRole('textbox', { name: 'Software name input' });
  }

  findSoftwareVersionInput() {
    return this.find().findByRole('textbox', { name: 'Software version input' });
  }

  // Packages tab
  findPackagesTab() {
    return this.find().findByRole('tab', { name: 'Displayed content packages tab' }).click();
  }

  findAddPackagesButton() {
    return this.find().findByRole('button', { name: 'Add packages' });
  }

  findPackageseNameInput() {
    return this.find().findByRole('textbox', { name: 'Packages name input' });
  }

  findPackagesVersionInput() {
    return this.find().findByRole('textbox', { name: 'Packages version input' });
  }

  // Software / Packages management
  findAddResourceButton() {
    return this.find().find('[data-id=add-resource-button]');
  }

  findSaveResourceButton() {
    return this.find().findByRole('button', { name: 'Save displayed content' });
  }

  findDiscardResourceButton() {
    return this.find().findByRole('button', { name: 'Discard displayed content' });
  }
}

export const notebookImageSettings = new NotebookImageSettings();
export const importNotebookImageModal = new ImportUpdateNotebookImageModal();
export const updateNotebookImageModal = new ImportUpdateNotebookImageModal(true);
