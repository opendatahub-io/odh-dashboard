class SingleBenchmarkWizardPage {
  visit(namespace: string) {
    cy.visit(`/evaluation/${namespace}/create/single-benchmark`);
    this.findSelectionTitle().should('be.visible');
    this.findBenchmarkGallery().should('exist');
    cy.testA11y();
  }

  findSelectionTitle() {
    return cy.findByTestId('app-page-title');
  }

  findBreadcrumb() {
    return cy.findByTestId('single-benchmark-breadcrumb');
  }

  findBenchmarkGallery() {
    return cy.findByTestId('benchmarks-gallery');
  }

  findBenchmarkCard(providerId: string, benchmarkId: string) {
    return cy.findByTestId(`benchmark-card-${providerId}-${benchmarkId}`);
  }

  findSelectBenchmarkButton(providerId: string, benchmarkId: string) {
    return this.findBenchmarkCard(providerId, benchmarkId).findByTestId('select-benchmark-button');
  }
}

export const singleBenchmarkWizardPage = new SingleBenchmarkWizardPage();
