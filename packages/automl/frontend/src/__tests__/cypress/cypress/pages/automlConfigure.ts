class AutomlConfigurePage {
  visit(namespace: string) {
    cy.visit(`/configure/${namespace}`);
    this.wait();
  }

  private wait() {
    this.findNameInput().should('be.visible');
    cy.testA11y();
  }

  findNameInput() {
    return cy.findByTestId('automl-name-input');
  }

  findNextButton() {
    return cy.findByTestId('automl-next-button');
  }

  findAwsSecretSelector() {
    return cy.findByTestId('aws-secret-selector');
  }

  findBrowseBucketButton() {
    return cy.findByTestId('browse-bucket-button');
  }

  findTargetColumnSelect() {
    return cy.findByTestId('target_column-select');
  }

  findPredictionTypeRadio(type: string) {
    return cy.findByTestId(`task-type-radio-${type}`);
  }

  findPresetRadio(preset: 'speed' | 'balanced') {
    return cy.findByTestId(`preset-radio-${preset}`);
  }

  findPresetContainer(preset: 'speed' | 'balanced') {
    return this.findPresetRadio(preset).parents('.pf-v6-c-radio');
  }

  findConfigureStepSubtitle() {
    return cy.findByTestId('configure-step-subtitle');
  }

  findFileExplorerTable() {
    return cy.findByTestId('file-explorer-table');
  }

  findFileExplorerSelectButton() {
    return cy.findByTestId('file-explorer-select-btn');
  }

  selectDropdownOption(name: RegExp | string) {
    return cy.findByRole('option', { name });
  }
}

export const automlConfigurePage = new AutomlConfigurePage();
