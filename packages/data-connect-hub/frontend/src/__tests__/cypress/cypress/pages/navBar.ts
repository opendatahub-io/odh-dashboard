class NavBar {
  findBrand() {
    return cy.get('.pf-v5-c-brand');
  }

  findNavToggleButton() {
    return cy.get('#page-nav-toggle');
  }

  findNamespaceSelector() {
    return cy.findByTestId('project-selector-toggle');
  }

  selectNamespace(name: string) {
    this.findNamespaceSelector().click();
    cy.findByRole('menuitem', { name }).click();
  }

  shouldNamespaceSelectorHaveNoItems() {
    this.findNamespaceSelector().should('not.exist');
  }

  shouldShowEmptyState() {
    return cy.findByTestId('empty-empty-state').should('exist');
  }
}

export const navBar = new NavBar();
