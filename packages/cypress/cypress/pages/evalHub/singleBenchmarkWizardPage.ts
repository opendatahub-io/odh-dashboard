class SingleBenchmarkWizardPage {
  findSelectionTitle(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('copy-suite-select-benchmarks-title', options);
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

  findConfigurationStep(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('copy-suite-step-benchmarks', options);
  }

  findConfiguredBenchmarkName(index: number, options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId(`benchmark-section-name-${index}`, options);
  }

  findBenchmarkParameterInput(
    index: number,
    parameterKey: string,
    options?: Partial<Cypress.Timeoutable>,
  ) {
    return cy.findByTestId(`benchmark-${index}-parameter-input-${parameterKey}`, options);
  }

  findAdvancedParametersToggle(index: number) {
    return cy
      .findByTestId(`benchmark-advanced-toggle-${index}`)
      .filter(':visible')
      .first()
      .find('button')
      .first();
  }

  expandAdvancedParameters(index: number) {
    return this.findAdvancedParametersToggle(index).then(($toggle) => {
      if ($toggle.attr('aria-expanded') !== 'true') {
        return cy.wrap($toggle).click();
      }

      return cy.wrap($toggle);
    });
  }

  findAdditionalParameters(index: number, options?: Partial<Cypress.Timeoutable>) {
    return cy
      .findByTestId(`benchmark-additional-parameters-${index}`, options)
      .filter(':visible')
      .first()
      .find('textarea')
      .first();
  }

  findContinueToRunButton(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('single-benchmark-continue-to-run', options);
  }
}

export const singleBenchmarkWizardPage = new SingleBenchmarkWizardPage();
