class PageNotFound {
  visit(path = '/force-not-found-page') {
    cy.visitWithLogin(path);
    this.wait();
  }

  private wait() {
    this.findPage();
    cy.testA11y();
  }

  findPage() {
    return cy.findByTestId('not-found-page');
  }

  findHomePageButton() {
    return cy.findByTestId('home-page-button');
  }
}

export const pageNotfound = new PageNotFound();
