class AutoragConfigurePage {
  visit(namespace: string) {
    cy.visit(`/configure/${namespace}`);
    this.findNameInput().should('be.visible');
  }

  findNameInput() {
    return cy.findByTestId('autorag-name-input');
  }

  findOgxSecretSelector() {
    return cy.findByTestId('ogx-secret-selector');
  }

  findAwsSecretSelector() {
    return cy.findByTestId('aws-secret-selector');
  }

  findNextButton() {
    return cy.findByTestId('autorag-next-button');
  }

  findBrowseBucketButton() {
    return cy.findByTestId('browse-bucket-button');
  }

  findPresetRadio(preset: 'speed' | 'balanced') {
    return cy.findByTestId(`preset-radio-${preset}`);
  }

  findConfigureDetailsSubtitle() {
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

export const autoragConfigurePage = new AutoragConfigurePage();
