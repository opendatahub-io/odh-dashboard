class TabRoutePage {
  visit(path: string) {
    cy.visitWithLogin(path);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-tab-page-title').should('exist');
    cy.testA11y();
  }

  findTab(tabId: string) {
    return cy.findByTestId(`tab-${tabId}`);
  }

  findPageTitle() {
    return cy.findByTestId('app-tab-page-title');
  }

  findTabBar() {
    return cy.findByRole('tablist');
  }
}

export const tabRoutePage = new TabRoutePage();
