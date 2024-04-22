import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { ServingRuntimeAPIProtocol } from '~/types';
import { DashboardCodeEditor } from './components/DashboardCodeEditor';

class ServingRuntimeRow {
  constructor(public readonly id: string) {}

  find() {
    return cy.findByTestId(`serving-runtime ${this.id}`);
  }

  shouldBeMultiModel(enabled = true) {
    this.find()
      .findByTestId('serving-runtime-platform-label')
      .findByTestId('multi-model')
      .should(enabled ? 'exist' : 'not.exist');
    return this;
  }

  shouldBeSingleModel(enabled = true) {
    this.find()
      .findByTestId('serving-runtime-platform-label')
      .findByTestId('single-model')
      .should(enabled ? 'exist' : 'not.exist');
    return this;
  }

  shouldHaveAPIProtocol(apiProtocol: ServingRuntimeAPIProtocol) {
    this.find().find('[data-label="API protocol"]').should('include.text', apiProtocol);
    return this;
  }
}

class ServingRuntimes {
  visit(wait = true) {
    cy.visit('/servingRuntimes');
    if (wait) {
      this.wait();
    }
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  private wait() {
    this.findAddButton();
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem('Serving runtimes', 'Settings');
  }

  findAppTitle() {
    return cy.findByTestId('app-page-title');
  }

  shouldBeMultiModel(enabled = true) {
    cy.findByTestId('multi-model-serving-enabled').should(enabled ? 'exist' : 'not.exist');
    return this;
  }

  shouldBeSingleModel(enabled = true) {
    cy.findByTestId('single-model-serving-enabled').should(enabled ? 'exist' : 'not.exist');
    return this;
  }

  findAddButton() {
    return cy.findByTestId('add-serving-runtime-button');
  }

  findStartFromScratchButton() {
    return cy.findByRole('button', { name: 'Start from scratch' });
  }

  findSubmitButton() {
    return cy.findByTestId('create-button');
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

  selectPlatform(value: string) {
    this.findSelectServingPlatformButton().click();
    cy.findByRole('menuitem', { name: value }).click();
  }

  selectAPIProtocol(value: string) {
    cy.findByRole('menuitem', { name: value }).click();
  }

  uploadYaml(filePath: string) {
    this.getDashboardCodeEditor().findUpload().selectFile([filePath], { force: true });
  }

  getDashboardCodeEditor() {
    return new DashboardCodeEditor(() => cy.findByTestId('dashboard-code-editor'));
  }

  getRowById(id: string) {
    return new ServingRuntimeRow(id);
  }
}

export const servingRuntimes = new ServingRuntimes();
