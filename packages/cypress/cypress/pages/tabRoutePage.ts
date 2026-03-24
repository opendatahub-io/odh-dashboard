class TabRoutePage {
  visit(path: string) {
    cy.visitWithLogin(path);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTab(tabId: string) {
    return cy.findByTestId(`tab-${tabId}`);
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }
}

export const tabRoutePage = new TabRoutePage();
