import { appChrome } from './appChrome';

class VllmAcceleratorConfigRow {
  constructor(public readonly name: string) {}

  find() {
    return cy.findByTestId(`vllm-accelerator-config ${this.name}`);
  }

  shouldHavePreInstalledLabel(enabled = true) {
    this.find()
      .findByTestId('pre-installed-label')
      .should(enabled ? 'exist' : 'not.exist');
    return this;
  }

  shouldHaveUnsupportedLabel(enabled = true) {
    this.find()
      .findByTestId('unsupported-label')
      .should(enabled ? 'exist' : 'not.exist');
    return this;
  }

  findEnabledToggle() {
    return this.find().findByTestId(`vllm-accelerator-config-enabled-toggle-${this.name}`);
  }

  shouldBeEnabled(enabled = true) {
    this.findEnabledToggle()
      .find('input')
      .should(enabled ? 'be.checked' : 'not.be.checked');
    return this;
  }
}

class VllmAcceleratorConfigs {
  visit(wait = true) {
    cy.visitWithLogin('/settings/model-resources-operations/vllm-accelerator-configs');
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
      name: 'vLLM accelerator configurations',
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

  getRowByName(name: string) {
    return new VllmAcceleratorConfigRow(name);
  }
}

export const vllmAcceleratorConfigs = new VllmAcceleratorConfigs();
