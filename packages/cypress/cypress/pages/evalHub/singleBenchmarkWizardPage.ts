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
    benchmarkId: string,
    providerId: string,
    options?: Partial<Cypress.Timeoutable>,
  ) {
    return this.findBenchmarksGallery(options).find(
      `[data-testid="benchmark-card-${providerId}-${benchmarkId}"]`,
      options,
    );
  }

  findSelectBenchmarkButton(
    benchmarkId: string,
    providerId: string,
    options?: Partial<Cypress.Timeoutable>,
  ) {
    return this.findBenchmarkCard(benchmarkId, providerId, options).findByTestId(
      'select-benchmark-button',
      options,
    );
  }
}

export const singleBenchmarkWizardPage = new SingleBenchmarkWizardPage();
