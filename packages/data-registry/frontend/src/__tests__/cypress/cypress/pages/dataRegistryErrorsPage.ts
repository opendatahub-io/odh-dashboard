class DataRegistryErrorsPage {
  visit(project: string) {
    cy.visit(`/ai-hub/data/browse?project=${encodeURIComponent(project)}`);
  }

  shouldShowServiceUnavailable() {
    cy.contains('Data Registry service is temporarily unavailable').should('be.visible');
  }

  shouldShowAccessDenied() {
    cy.contains('You do not have the required access to this project').should('be.visible');
  }

  shouldShowConnectionError() {
    cy.contains('Connection failed').should('be.visible');
  }

  shouldShowRetryButton() {
    cy.findByTestId('retry-button').should('be.visible');
  }

  shouldNotShowRetryButton() {
    cy.findByTestId('retry-button').should('not.exist');
  }

  clickRetryButton() {
    cy.findByTestId('retry-button').click();
  }

  shouldShowData() {
    cy.findByTestId('registry-table').should('exist');
  }

  testA11y() {
    cy.then(() => cy.testA11y());
  }
}

export default new DataRegistryErrorsPage();
