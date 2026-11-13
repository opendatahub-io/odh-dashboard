type BenchmarkIdentifier = {
  providerId: string;
  benchmarkId: string;
};

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

  findBenchmarkCard({ providerId, benchmarkId }: BenchmarkIdentifier) {
    return cy.findByTestId(`benchmark-card-${providerId}-${benchmarkId}`);
  }

  findSelectBenchmarkButton(benchmark: BenchmarkIdentifier) {
    return this.findBenchmarkCard(benchmark).findByTestId('select-benchmark-button');
  }
}

export const singleBenchmarkWizardPage = new SingleBenchmarkWizardPage();
