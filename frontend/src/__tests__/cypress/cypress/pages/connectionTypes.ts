import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { TableRow } from './components/table';
import { TableToolbar } from './components/TableToolbar';

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

  findSubmitButton() {
    return cy.findByTestId('submit-button');
  }
}

class ConnectionTypesTableToolbar extends TableToolbar {}
class ConnectionTypeRow extends TableRow {
  findConnectionTypeName() {
    return this.find().findByTestId('connection-type-name');
  }

  shouldHaveName(name: string) {
    return this.findConnectionTypeName().should('have.text', name);
  }

  findConnectionTypeDescription() {
    return this.find().findByTestId('table-row-title-description');
  }

  findConnectionTypeCreator() {
    return this.find().findByTestId('connection-type-creator');
  }

  shouldHaveDescription(description: string) {
    return this.findConnectionTypeDescription().should('have.text', description);
  }

  shouldHaveCreator(creator: string) {
    return this.findConnectionTypeCreator().should('have.text', creator);
  }

  shouldShowPreInstalledLabel() {
    return this.find().findByTestId('connection-type-user-label').should('exist');
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
  }

  shouldBeDisabled() {
    this.findEnabled().should('not.be.checked');
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
    return cy.findByTestId('no-result-found-title');
  }

  findSortButton(name: string) {
    return this.findTable().find('thead').findByRole('button', { name });
  }

  getTableToolbar() {
    return new ConnectionTypesTableToolbar(() => cy.findByTestId('connection-types-table-toolbar'));
  }
}

export const connectionTypesPage = new ConnectionTypesPage();
export const createConnectionTypePage = new CreateConnectionTypePage();
