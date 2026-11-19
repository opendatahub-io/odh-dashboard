class AutomlConfigurePage {
  visit(namespace: string) {
    cy.visit(`/develop-train/automl/configure/${namespace}`);
    this.waitCreateStep();
  }

  private waitCreateStep() {
    cy.findByTestId('automl-name-input');
    cy.testA11y();
  }

  findNameInput() {
    return cy.findByTestId('automl-name-input');
  }

  findNextButton() {
    return cy.findByTestId('automl-next-button');
  }

  findDocumentsHeading() {
    return cy.findByRole('heading', { name: 'Documents' });
  }

  findAutoSplitRadio() {
    return cy.findByTestId('dataset-split-auto');
  }

  findSeparateDatasetsRadio() {
    return cy.findByTestId('dataset-split-separate');
  }

  findTrainingAccordion() {
    return cy.findByTestId('training-data-accordion-toggle');
  }

  findTestAccordion() {
    return cy.findByTestId('test-data-accordion-toggle');
  }

  findIncompleteSteps() {
    return cy.findAllByText('Incomplete');
  }

  findCreateRunButton() {
    return cy.findByTestId('automl-create-run-button');
  }

  selectStorageSecret(secretName: string, selectorTestId = 'aws-secret-selector') {
    cy.findByTestId(selectorTestId).click();
    cy.findByTestId(selectorTestId).find('input').type(secretName);
    cy.findByRole('option', { name: new RegExp(`^${secretName}$`, 'i') })
      .should('be.visible')
      .click();
    cy.findByTestId(selectorTestId).find('input').should('have.value', secretName);
  }
}

export const automlConfigurePage = new AutomlConfigurePage();
