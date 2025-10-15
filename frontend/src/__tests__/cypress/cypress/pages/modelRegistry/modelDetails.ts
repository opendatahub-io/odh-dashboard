class ModelDetails {
  visit() {
    const preferredModelRegistry = 'modelregistry-sample';
    const rmId = '1';
    cy.visit(`/ai-hub/registry/${preferredModelRegistry}/registered-models/${rmId}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findModelActionToggle() {
    return cy.findByTestId('model-action-toggle');
  }

  findModelVersionActionToggle() {
    return cy.findByTestId('model-version-action-toggle');
  }
}

export const modelDetails = new ModelDetails();
