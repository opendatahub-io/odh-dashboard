class EnabledPage {
  visit() {
    cy.visitWithLogin('/applications/enabled');
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

  findCard(cardName: string) {
    return cy.findByTestId(`card ${cardName}`);
  }

  findCardKebab(cardName: string) {
    return this.findCard(cardName).findByTestId('app-actions-toggle');
  }

  findUninstallItem(cardName: string) {
    this.findCardKebab(cardName).click();
    return cy.findByTestId('uninstall-app');
  }
}

export const enabledPage = new EnabledPage();
