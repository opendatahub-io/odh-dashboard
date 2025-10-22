import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import type { ServingRuntimeAPIProtocol } from '#~/types';
import { DashboardCodeEditor } from './components/DashboardCodeEditor';

class ServingRuntimeRow {
  constructor(public readonly id: string) {}

  find() {
    return cy.findByTestId(`serving-runtime ${this.id}`);
  }

  shouldHavePreInstalledLabel(enabled = true) {
    this.find()
      .findByTestId('pre-installed-label')
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

  findServingRuntimeVersionLabel() {
    return this.find().findByTestId('serving-runtime-version-label');
  }
}

class ServingRuntimes {
  visit(wait = true) {
    cy.visitWithLogin('/settings/model-resources-operations/serving-runtimes');
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
    return appChrome.findNavItem({
      name: 'Serving runtimes',
      rootSection: 'Settings',
      subSection: 'Model resources and operations',
    });
  }

  findAppTitle() {
    return cy.findByTestId('app-page-title');
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

  findSelectAPIProtocolButton() {
    return cy.findByTestId('custom-serving-api-protocol-selection');
  }

  findSelectModelTypes() {
    return cy.findByTestId('custom-serving-model-type-selection').find('button');
  }

  findPredictiveModelOption() {
    return cy.findByTestId('model-type-option-predictive').find('input[type="checkbox"]');
  }

  findGenerativeAIModelOption() {
    return cy.findByTestId('model-type-option-generative').find('input[type="checkbox"]');
  }

  shouldDisplayAPIProtocolValues(values: ServingRuntimeAPIProtocol[]) {
    this.findSelectAPIProtocolButton().click();
    values.forEach((value) => cy.findByRole('option', { name: value }).should('exist'));
    return this;
  }

  selectAPIProtocol(value: string) {
    cy.findByRole('option', { name: value }).click();
  }

  findSelectModelTypeButton() {
    return cy.findByTestId('custom-serving-model-type-selection').find('button');
  }

  selectModelType(value: 'Predictive model' | 'Generative AI model (e.g., LLM)') {
    cy.contains('.pf-v6-c-menu__item-text', value).click();
    // Close the dropdown by clicking the toggle button again
    this.findSelectModelTypeButton().click();
    // Wait for the dropdown to close
    cy.get('.pf-v6-c-menu').should('not.exist');
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

  findEditModel() {
    return cy.findByLabelText('Kebab toggle');
  }

  findDeleteModel() {
    return cy.contains('button', 'Delete');
  }

  findDeleteModal() {
    return cy.get('[data-testid="delete-modal-input"]');
  }

  findDeleteModelServingButton() {
    return cy.get('button').contains('Delete serving runtime');
  }
}

export const servingRuntimes = new ServingRuntimes();
