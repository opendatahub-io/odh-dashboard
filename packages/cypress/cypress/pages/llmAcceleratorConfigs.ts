import { appChrome } from './appChrome';
import { DashboardCodeEditor } from './components/DashboardCodeEditor';

class LlmAcceleratorConfigRow {
  constructor(public readonly name: string) {}

  find() {
    return cy.findByTestId(`llm-accelerator-config ${this.name}`);
  }

  findKebabToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByLabelText('Kebab toggle');
  }

  findDuplicateAction(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findKebabAction('Duplicate');
  }

  findEditButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findKebabAction('Edit');
  }

  findDeleteButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findKebabAction('Delete');
  }

  shouldHavePreInstalledLabel(enabled = true) {
    this.find()
      .findByTestId('pre-installed-label')
      .should(enabled ? 'exist' : 'not.exist');
    return this;
  }

  shouldHaveUnsupportedLabel(enabled = true) {
    this.find()
      .findByTestId('limited-support-label')
      .should(enabled ? 'exist' : 'not.exist');
    return this;
  }

  private findEnabledToggleInput() {
    return this.find().findByTestId(`llm-accelerator-config-enabled-toggle-${this.name}`);
  }

  findEnabledToggle() {
    return this.findEnabledToggleInput().parent('label');
  }

  shouldBeEnabled(enabled = true) {
    this.findEnabledToggleInput().should(enabled ? 'be.checked' : 'not.be.checked');
    return this;
  }
}

class UnsupportedStatusAcceptanceModal {
  find() {
    return cy.findByTestId('unsupported-status-acceptance-modal');
  }

  shouldBeOpen() {
    this.find().should('exist');
    return this;
  }

  shouldNotExist() {
    cy.findByTestId('unsupported-status-acceptance-modal').should('not.exist');
    return this;
  }

  findAcceptanceCheckbox() {
    return this.find().findByTestId('unsupported-status-acceptance-checkbox');
  }

  findAcceptButton() {
    return this.find().findByTestId('unsupported-status-accept-button');
  }

  findCancelButton() {
    return this.find().findByTestId('unsupported-status-cancel-button');
  }
}

class LlmAcceleratorConfigs {
  visit(wait = true) {
    cy.visitWithLogin(
      '/settings/model-resources-operations/model-deployment-settings/llm-accelerator-configurations',
    );
    if (wait) {
      this.wait();
    }
  }

  private wait() {
    this.findAddButton();
    cy.testA11y();
  }

  navigate() {
    this.findNavItem().click();
    this.findTab().should('exist').click();
    this.wait();
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'Model deployment settings',
      rootSection: 'Settings',
      subSection: 'Model resources and operations',
    });
  }

  findAppTitle() {
    return cy.findByTestId('app-page-title');
  }

  /** Title of the tabbed "Model deployment settings" page that hosts the tab. */
  findTabPageTitle() {
    return cy.findByTestId('app-tab-page-title');
  }

  findTab() {
    return cy.findByTestId('tab-llm-accelerator-configurations');
  }

  findEmptyState() {
    return cy.findByTestId('llm-accelerator-configs-empty-state');
  }

  findAddButton() {
    return cy.findByTestId('add-accelerator-config-button');
  }

  findSubmitButton() {
    return cy.findByTestId('submit-button');
  }

  findCancelButton() {
    return cy.findByTestId('cancel-button');
  }

  findNameInput() {
    return cy.findByTestId('llm-accelerator-config-name');
  }

  findEditResourceNameLink() {
    return cy.findByTestId('llm-accelerator-config-editResourceLink');
  }

  findResourceNameInput() {
    return cy.findByTestId('llm-accelerator-config-resourceName');
  }

  findVersionInput() {
    return cy.findByTestId('llm-accelerator-config-version');
  }

  findYAMLCodeEditor() {
    return new DashboardCodeEditor(() => cy.findByTestId('config-yaml-editor'));
  }

  getRowByName(name: string) {
    return new LlmAcceleratorConfigRow(name);
  }
}

export const llmAcceleratorConfigs = new LlmAcceleratorConfigs();
export const unsupportedStatusAcceptanceModal = new UnsupportedStatusAcceptanceModal();
