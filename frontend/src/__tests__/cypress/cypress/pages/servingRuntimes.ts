import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';

class ServingRuntimeRow {
  constructor(public readonly id: string) {}

  find() {
    return cy.get(`#${this.id}`);
  }

  shouldBeMultiModel(enabled = true) {
    this.find()
      .findByRole('list', { name: 'Label group category' })
      .findByText('Multi-model')
      .should(enabled ? 'exist' : 'not.exist');
    return this;
  }

  shouldBeSingleModel(enabled = true) {
    this.find()
      .findByRole('list', { name: 'Label group category' })
      .findByText('Single-model')
      .should(enabled ? 'exist' : 'not.exist');
    return this;
  }
}

class ServingRuntimes {
  visit() {
    cy.visitWithLogin('/servingRuntimes');
    this.wait();
  }

  navigate() {
    appChrome.findNavItem('Serving runtimes', 'Settings').click();
    this.wait();
  }

  private wait() {
    this.findAddButton();
    cy.testA11y();
  }

  shouldBeMultiModel(enabled = true) {
    cy.findByText('Multi-model serving enabled').should(enabled ? 'exist' : 'not.exist');
    return this;
  }

  shouldBeSingleModel(enabled = true) {
    cy.findByText('Single-model serving enabled').should(enabled ? 'exist' : 'not.exist');
    return this;
  }

  findAddButton() {
    return cy.findByRole('button', { name: 'Add serving runtime' });
  }

  findSelectValueButton() {
    return cy.findByRole('button', { name: 'Select a value' });
  }

  shouldDisplayValues(values: string[]) {
    this.findSelectValueButton().click();
    values.forEach((value) => cy.findByRole('menuitem', { name: value }).should('exist'));
    return this;
  }

  getRowById(id: string) {
    return new ServingRuntimeRow(id);
  }
}

export const servingRuntimes = new ServingRuntimes();
