class EnabledPage {
  visit(homeEnabled = false) {
    cy.visit(homeEnabled ? '/enabled' : '/');
    this.wait();
  }

  private wait() {
    cy.findByTestId('enabled-application').should('be.visible');
    cy.testA11y();
  }
}

export const enabledPage = new EnabledPage();
