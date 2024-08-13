class EnabledPage {
  visit() {
    cy.visitWithLogin('/enabled');
    this.wait();
  }

  shouldHaveEnabledPageSection() {
    cy.findByTestId('enabled-application').should('be.visible');
    return this;
  }

  private wait() {
    this.shouldHaveEnabledPageSection();
    cy.testA11y();
  }
}

export const enabledPage = new EnabledPage();
