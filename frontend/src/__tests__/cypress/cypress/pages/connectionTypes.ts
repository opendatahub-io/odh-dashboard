import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { TableRow } from './components/table';
import { TableToolbar } from './components/TableToolbar';

class ConnectionTypesTableToolbar extends TableToolbar {}
class ConnectionTypeRow extends TableRow {
  findConnectionTypeName() {
    return this.find().findByTestId('connection-type-name');
  }

  shouldHaveName(name: string) {
    return this.findConnectionTypeName().should('have.text', name);
  }

  findConnectionTypeDescription() {
    return this.find().findByTestId('connection-type-description');
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
      this.findTable().findAllByTestId(`connection-type-name`).contains(name).parents('tr'),
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
