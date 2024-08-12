import { TableRow } from './components/table';

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

export const createConnectionTypePage = new CreateConnectionTypePage();
