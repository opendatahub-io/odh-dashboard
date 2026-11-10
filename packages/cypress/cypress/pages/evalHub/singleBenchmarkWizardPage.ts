class SingleBenchmarkWizardPage {
  findSelectionTitle(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('copy-suite-select-benchmarks-title', options);
  }

  findBreadcrumb(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('single-benchmark-breadcrumb', options);
  }

  findBenchmarkCatalogSearch(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('benchmark-catalog-search', options).find('input').first();
  }

  findBenchmarkCatalogTable(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('benchmark-catalog-table', options);
  }

  findBenchmarkCheckbox(
    benchmarkId: string,
    providerId: string,
    options?: Partial<Cypress.Timeoutable>,
  ) {
    return this.findBenchmarkCatalogTable(options).find(
      `[data-testid="benchmark-catalog-checkbox-${benchmarkId}"]` +
        `[id="benchmark-catalog-${providerId}:${benchmarkId}"]`,
      options,
    );
  }

  findNextButton(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('copy-suite-next-select-benchmarks', options);
  }
}

export const singleBenchmarkWizardPage = new SingleBenchmarkWizardPage();
