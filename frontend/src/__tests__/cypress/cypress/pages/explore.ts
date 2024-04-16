class ExplorePage {
  visit() {
    cy.visit('/explore');
    this.wait();
  }

  private wait() {
    cy.findByTestId('explore-applications').should('be.visible');
    cy.testA11y();
  }
}

export const explorePage = new ExplorePage();
