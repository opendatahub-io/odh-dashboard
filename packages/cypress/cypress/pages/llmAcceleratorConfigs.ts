import { appChrome } from './appChrome';

class LlmAcceleratorConfigRow {
  constructor(public readonly name: string) {}

  find() {
    return cy.findByTestId(`llm-accelerator-config ${this.name}`);
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

  findAcceptButton() {
    return this.find().findByTestId('unsupported-status-accept-button');
  }

  findCancelButton() {
    return this.find().findByTestId('unsupported-status-cancel-button');
  }
}

class LlmAcceleratorConfigs {
  visit(wait = true) {
    cy.visitWithLogin('/settings/model-resources-operations/llm-accelerator-configs');
    if (wait) {
      this.wait();
    }
  }

  private wait() {
    this.findAddButton();
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'LLM accelerator configurations',
      rootSection: 'Settings',
      subSection: 'Model resources and operations',
    });
  }

  findAppTitle() {
    return cy.findByTestId('app-page-title');
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

  findVersionInput() {
    return cy.findByTestId('llm-accelerator-config-version');
  }

  findYamlEditor() {
    return cy.findByTestId('config-yaml-editor');
  }

  setYamlEditorContent(value: string) {
    this.findYamlEditor()
      .find('input[type="file"]')
      .selectFile(
        {
          contents: Cypress.Buffer.from(value),
          fileName: 'editor-content.yaml',
          mimeType: 'text/yaml',
        },
        { force: true },
      );
  }

  getRowByName(name: string) {
    return new LlmAcceleratorConfigRow(name);
  }
}

export const llmAcceleratorConfigs = new LlmAcceleratorConfigs();
export const unsupportedStatusAcceptanceModal = new UnsupportedStatusAcceptanceModal();
