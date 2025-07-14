import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import { Modal } from '#~/__tests__/cypress/cypress/pages/components/Modal';
import { TableRow } from './components/table';
import { TableToolbar } from './components/TableToolbar';
import { Contextual } from './components/Contextual';

class CreateConnectionTypeTableRow extends TableRow {
  findSectionHeading() {
    return this.find().findByTestId('section-heading');
  }

  findName() {
    return this.find().findByTestId('field-name');
  }

  findType() {
    return this.find().findByTestId('field-type');
  }

  findDefault() {
    return this.find().findByTestId('field-default');
  }

  findEnvVar() {
    return this.find().findByTestId('field-env');
  }

  findRequired() {
    return this.find().findByTestId('field-required');
  }

  dragToIndex(i: number) {
    const dataTransfer = new DataTransfer();
    this.find().trigger('dragstart', { dataTransfer });
    createConnectionTypePage
      .getFieldsTableRow(i)
      .find()
      .trigger('dragover', { dataTransfer })
      .trigger('drop', { dataTransfer })
      .trigger('dragend');
  }
}

class CreateConnectionTypePage {
  visitCreatePage() {
    cy.visitWithLogin('/connectionTypes/create');
    cy.findAllByText('Create connection type').should('exist');
  }

  visitDuplicatePage(name = 'existing') {
    cy.visitWithLogin(`/connectionTypes/duplicate/${name}`);
    cy.findAllByText('Create connection type').should('exist');
  }

  visitEditPage(name = 'existing') {
    cy.visitWithLogin(`/connectionTypes/edit/${name}`);
    cy.findAllByText('Edit connection type').should('exist');
  }

  findConnectionTypeName() {
    return cy.findByTestId('connection-type-name');
  }

  findConnectionTypeDesc() {
    return cy.findByTestId('connection-type-description');
  }

  findConnectionTypeEnableCheckbox() {
    return cy.findByTestId('connection-type-enable');
  }

  findConnectionTypePreviewToggle() {
    return cy.findByTestId('preview-drawer-toggle-button');
  }

  findFieldsTable() {
    return cy.findByTestId('connection-type-fields-table');
  }

  findAllFieldsTableRows() {
    return this.findFieldsTable().findAllByTestId('row');
  }

  getFieldsTableRow(index: number) {
    return new CreateConnectionTypeTableRow(() => this.findAllFieldsTableRows().eq(index));
  }

  findFooterError() {
    return cy.findByTestId('connection-type-footer-error');
  }

  findSubmitButton() {
    return cy.findByTestId('submit-button');
  }

  shouldHaveTableRowNames(rowNames: string[]) {
    rowNames.map((name, index) =>
      this.getFieldsTableRow(index).findName().should('contain.text', name),
    );
    return this;
  }

  getCategorySection() {
    return new CategorySection(() => cy.findByTestId('connection-type-category-toggle'));
  }

  findDuplicateConnectionTypeButton() {
    return cy.findByTestId('duplicate-connection-type');
  }

  findCompatibleModelServingTypesAlert() {
    return cy.findByTestId('compatible-model-serving-types-alert');
  }

  findModelServingCompatibleTypeDropdown() {
    return cy.findByTestId('select-model-serving-compatible-type');
  }
}

class CategorySection extends Contextual<HTMLElement> {
  findCategoryTable() {
    return this.find().click();
  }

  private findChipGroup() {
    return this.find().findByRole('list', { name: 'Current selections' });
  }

  findChipItem(name: string | RegExp) {
    return this.findChipGroup().find('li').contains('span', name);
  }

  clearMultiChipItem() {
    this.find().findByRole('button', { name: 'Clear input value' }).click();
  }

  findMultiGroupInput() {
    return this.find().find('input');
  }

  findMultiGroupSelectButton(name: string) {
    return cy.findByTestId(`select-multi-typeahead-${name}`);
  }
}

class ConnectionTypesTableToolbar extends TableToolbar {}
class ConnectionTypeRow extends TableRow {
  findConnectionTypeName() {
    return this.find().findByTestId('connection-type-name');
  }

  shouldHaveName(name: string) {
    this.findConnectionTypeName().should('have.text', name);
    return this;
  }

  findConnectionTypeDescription() {
    return this.find().findByTestId('table-row-title-description');
  }

  findConnectionTypeCreator() {
    return this.find().findByTestId('connection-type-creator');
  }

  findConnectionTypeCompatibility() {
    return this.find().findByTestId('connection-type-compatibility');
  }

  shouldHaveDescription(description: string) {
    this.findConnectionTypeDescription().should('contain.text', description);
    return this;
  }

  shouldHaveCreator(creator: string) {
    this.findConnectionTypeCreator().should('have.text', creator);
    return this;
  }

  shouldShowPreInstalledLabel() {
    this.find().findByTestId('connection-type-user-label').should('exist');
    return this;
  }

  findEnabled() {
    return this.find().pfSwitchValue('connection-type-enable-switch');
  }

  findEnableSwitch() {
    return this.find().pfSwitch('connection-type-enable-switch');
  }

  findEnableSwitchInput() {
    return this.find().findByTestId('connection-type-enable-switch');
  }

  shouldBeEnabled() {
    this.findEnabled().should('be.checked');
    return this;
  }

  shouldBeDisabled() {
    this.findEnabled().should('not.be.checked');
    return this;
  }

  findEnableStatus() {
    return this.find().findByTestId('connection-type-enable-status');
  }
}

class ConnectionTypesPage {
  visit() {
    cy.visitWithLogin('/connectionTypes');
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem('Connection types');
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  shouldHaveConnectionTypes() {
    this.findTable().should('exist');
    return this;
  }

  shouldReturnNotFound() {
    cy.findByTestId('not-found-page').should('exist');
    return this;
  }

  shouldBeEmpty() {
    cy.findByTestId('connection-types-empty-state').should('exist');
    return this;
  }

  findTable() {
    return cy.findByTestId('connection-types-table');
  }

  getConnectionTypeRow(name: string) {
    return new ConnectionTypeRow(() =>
      this.findTable().findAllByTestId(`table-row-title`).contains(name).parents('tr'),
    );
  }

  findEmptyFilterResults() {
    return cy.findByTestId('dashboard-empty-table-state');
  }

  findSortButton(name: string) {
    return this.findTable().find('thead').findByRole('button', { name });
  }

  getTableToolbar() {
    return new ConnectionTypesTableToolbar(() => cy.findByTestId('connection-types-table-toolbar'));
  }
}

class ConnectionTypePreviewModal extends Modal {
  constructor() {
    super('Preview connection');
  }
}

export const connectionTypesPage = new ConnectionTypesPage();
export const createConnectionTypePage = new CreateConnectionTypePage();
export const connectionTypePreviewModal = new ConnectionTypePreviewModal();
