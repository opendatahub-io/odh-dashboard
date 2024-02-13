class ExplorePage {
  visit() {
    cy.visitWithLogin('/explore');
    this.wait();
  }

  private wait() {
    cy.findByTestId('explore-applications').should('be.visible');
    cy.testA11y();
  }

  findExploreCard(metadataName: string) {
    return cy.findByTestId(metadataName);
  }

  findDrawerPanel() {
    return cy.findByTestId('explore-drawer-panel');
  }
}

export const explorePage = new ExplorePage();
