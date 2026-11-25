type BenchmarkIdentifier = {
  providerId: string;
  benchmarkId: string;
};

class SingleBenchmarkWizardPage {
  findBreadcrumb(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('single-benchmark-breadcrumb', options);
  }

  findBenchmarkSearch(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('benchmarks-name-filter', options).find('input').first();
  }

  findBenchmarksGallery(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('benchmarks-gallery', options);
  }

  findBenchmarkCard(
    { providerId, benchmarkId }: BenchmarkIdentifier,
    options?: Partial<Cypress.Timeoutable>,
  ) {
    return this.findBenchmarksGallery(options).find(
      `[data-testid="benchmark-card-${providerId}-${benchmarkId}"]`,
      options,
    );
  }

  findSelectBenchmarkButton(
    benchmark: BenchmarkIdentifier,
    options?: Partial<Cypress.Timeoutable>,
  ) {
    return this.findBenchmarkCard(benchmark, options).findByTestId(
      'select-benchmark-button',
      options,
    );
  }
}

export const singleBenchmarkWizardPage = new SingleBenchmarkWizardPage();
