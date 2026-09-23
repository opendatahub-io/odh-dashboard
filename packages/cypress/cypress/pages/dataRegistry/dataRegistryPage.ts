class DataRegistryPage {
  visit(project: string) {
    cy.visit(`/data-registry?project=${project}`);
  }

  waitForErrorState() {
    cy.get('[data-testid="error-display"]', { timeout: 10000 }).should('exist');
  }

  shouldShowServiceUnavailable() {
    cy.contains('Data Registry service is temporarily unavailable').should('be.visible');
  }

  shouldShowAccessDenied() {
    cy.contains('You do not have access to this project').should('be.visible');
  }

  shouldShowConnectionError() {
    cy.contains('Connection failed').should('be.visible');
  }

  shouldDisableRegisterDataButton() {
    cy.get('[data-testid="register-data-button"]').should('be.disabled');
  }

  shouldDisableManageCollectionsAction() {
    cy.get('[data-testid="actions-dropdown"]').click();
    cy.get('[data-testid="manage-collections-action"]').should(
      'have.attr',
      'aria-disabled',
      'true',
    );
  }

  shouldDisableManageLabelsAction() {
    cy.get('[data-testid="actions-dropdown"]').click();
    cy.get('[data-testid="manage-labels-action"]').should('have.attr', 'aria-disabled', 'true');
  }

  clickRetryButton() {
    cy.get('[data-testid="retry-button"]').click();
  }

  shouldShowData() {
    cy.get('[data-testid="registry-table"]').should('exist');
  }
}

export default new DataRegistryPage();
