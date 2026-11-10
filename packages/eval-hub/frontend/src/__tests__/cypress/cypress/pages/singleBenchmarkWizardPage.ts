class SingleBenchmarkWizardPage {
  visit(namespace: string) {
    cy.visit(`/evaluation/${namespace}/create/single-benchmark`);
    this.waitForSelectionStep();
  }

  private waitForSelectionStep() {
    this.findSelectionTitle().should('be.visible');
    this.findBenchmarkCatalog().should('exist');
    cy.testA11y();
  }

  findSelectionTitle() {
    return cy.findByTestId('copy-suite-select-benchmarks-title');
  }

  findBreadcrumb() {
    return cy.findByTestId('single-benchmark-breadcrumb');
  }

  findBenchmarkCatalog() {
    return cy.findByTestId('benchmark-catalog-table');
  }

  findBenchmarkCheckbox(benchmarkId: string) {
    return cy.findByTestId(`benchmark-catalog-checkbox-${benchmarkId}`);
  }

  findNextButton() {
    return cy.findByTestId('copy-suite-next-select-benchmarks');
  }
}

export const singleBenchmarkWizardPage = new SingleBenchmarkWizardPage();
