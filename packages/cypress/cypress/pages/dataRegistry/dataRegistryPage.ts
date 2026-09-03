class DataRegistryPage {
  visit(project?: string) {
    const url = project ? `/ai-hub/data?project=${project}` : '/ai-hub/data';
    cy.visit(url);
  }

  findProjectSelector() {
    return cy.findByTestId('project-selector');
  }

  findRegisterDataButton() {
    return cy.findByTestId('register-data-button');
  }

  findManageCollectionsAction() {
    return cy.findByTestId('manage-collections-action');
  }

  findManageLabelsAction() {
    return cy.findByTestId('manage-labels-action');
  }

  findRetryButton() {
    return cy.findByTestId('retry-button');
  }

  findErrorMessage(text: string) {
    return cy.contains(text);
  }

  shouldShowServiceUnavailableError() {
    this.findErrorMessage('Data Registry service is temporarily unavailable').should('be.visible');
    this.findRetryButton().should('be.visible');
  }

  shouldShowAccessDeniedError() {
    this.findErrorMessage('Access denied').should('be.visible');
    this.findRetryButton().should('not.exist');
  }

  shouldShowConnectionError() {
    this.findErrorMessage('Connection failed').should('be.visible');
    this.findRetryButton().should('be.visible');
  }

  shouldDisableWriteActions() {
    this.findRegisterDataButton().should('be.disabled');
  }
}

export const dataRegistryPage = new DataRegistryPage();
