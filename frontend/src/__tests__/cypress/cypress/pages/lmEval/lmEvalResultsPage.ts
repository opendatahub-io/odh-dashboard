class LMEvalResultsPage {
  visit(namespace: string, evaluationName: string) {
    cy.visitWithLogin(`/modelEvaluations/${namespace}/${evaluationName}`);
    this.wait();
  }

  private wait() {
    this.findPageTitle().should('exist');
    cy.testA11y();
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findBreadcrumb() {
    return cy.findByRole('navigation', { name: 'Breadcrumb' });
  }

  findBreadcrumbItem(name: string) {
    return this.findBreadcrumb().findByText(name);
  }

  findDownloadButton() {
    return cy.findByRole('button', { name: 'Download JSON' });
  }

  findResultsTable() {
    return cy.findByRole('grid');
  }

  findToolbar() {
    return cy.findByTestId('lm-eval-result-toolbar');
  }

  findColumnFilter() {
    return this.findToolbar().findByTestId('column-filter');
  }

  findSearchInput() {
    return this.findToolbar().findByRole('textbox');
  }

  selectFilterColumn(columnName: string) {
    this.findColumnFilter().click();
    cy.findByRole('menuitem', { name: columnName }).click();
  }

  searchForValue(value: string) {
    this.findSearchInput().clear();
    if (value) {
      this.findSearchInput().type(value);
    }
  }

  verifyPageTitle(title: string) {
    this.findPageTitle().should('contain.text', title);
  }

  verifyBreadcrumbNavigation() {
    this.findBreadcrumbItem('Model evaluations').should('exist');
  }

  verifyDownloadButtonExists() {
    this.findDownloadButton().should('exist');
  }
}

export const lmEvalResultsPage = new LMEvalResultsPage();
