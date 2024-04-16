class PageNotFound {
  visit(name: string) {
    cy.visit(`/${name}`);
    this.wait();
  }

  private wait() {
    this.findHomePageButton();
    cy.testA11y();
  }

  shouldHavePageNotFoundTitle() {
    cy.findByTestId('not-found-page-title').should('have.text', 'We can‘t find that page');
    return this;
  }

  shouldHavePageNotFoundDescription() {
    cy.findByTestId('not-found-page-description').should(
      'have.text',
      'Another page might have what you need. Return to the home page.',
    );
    return this;
  }

  findHomePageButton() {
    return cy.findByTestId('home-page-button');
  }
}

export const pageNotfound = new PageNotFound();
