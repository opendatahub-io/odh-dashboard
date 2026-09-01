class ExplorePage {
  visit() {
    cy.visitWithLogin('/applications/explore');
    this.wait();
  }

  reload() {
    cy.reload();
    this.wait();
  }

  private wait() {
    cy.findByTestId('explore-applications').should('be.visible');
    cy.testA11y();
  }

  findCardLocator(cardName: string) {
    return cy.get(`[data-testid="card ${cardName}"] label`);
  }

  findCard(cardName: string) {
    return cy.findByTestId(`card ${cardName}`);
  }
}

export const explorePage = new ExplorePage();
