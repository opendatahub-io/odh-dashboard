class AutomlConfigurePage {
  visit(namespace: string) {
    cy.visit(`/configure/${namespace}`);
    cy.findByTestId('automl-name-input').should('be.visible');
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

  findConfigureStepSubtitle() {
    return cy.findByTestId('configure-step-subtitle');
  }
}

export const automlConfigurePage = new AutomlConfigurePage();
