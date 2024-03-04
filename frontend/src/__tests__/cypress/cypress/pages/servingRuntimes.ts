import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { ServingRuntimeAPIProtocol } from '~/types';

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

  shouldHaveAPIProtocol(apiProtocol: ServingRuntimeAPIProtocol) {
    this.find().get('[data-label="API protocol"]').should('include.text', apiProtocol);
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

  findStartFromScratchButton() {
    return cy.findByRole('button', { name: 'Start from scratch' });
  }

  findCreateButton() {
    return cy.findByRole('button', { name: 'Create' });
  }

  findCancelButton() {
    return cy.findByRole('button', { name: 'Cancel' });
  }

  findSelectServingPlatformButton() {
    return cy.findByTestId('custom-serving-runtime-selection');
  }

  findSelectAPIProtocolButton() {
    return cy.findByTestId('custom-serving-api-protocol-selection');
  }

  shouldDisplayServingRuntimeValues(values: string[]) {
    this.findSelectServingPlatformButton().click();
    values.forEach((value) => cy.findByRole('menuitem', { name: value }).should('exist'));
    return this;
  }

  shouldDisplayAPIProtocolValues(values: ServingRuntimeAPIProtocol[]) {
    this.findSelectAPIProtocolButton().click();
    values.forEach((value) => cy.findByRole('menuitem', { name: value }).should('exist'));
    return this;
  }

  shouldSelectPlatform(value: string) {
    this.findSelectServingPlatformButton().click();
    cy.findByRole('menuitem', { name: value }).click();
  }

  shouldSelectAPIProtocol(value: string) {
    cy.findByRole('menuitem', { name: value }).click();
  }

  shouldEnterData() {
    cy.get('.view-lines.monaco-mouse-cursor-text').type('test');
  }

  getRowById(id: string) {
    return new ServingRuntimeRow(id);
  }
}

export const servingRuntimes = new ServingRuntimes();
