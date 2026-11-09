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

  findBenchmarkCatalog() {
    return cy.findByTestId('benchmark-catalog-table');
  }

  findBenchmarkCheckbox(benchmarkId: string) {
    return cy.findByTestId(`benchmark-catalog-checkbox-${benchmarkId}`);
  }

  findNextButton() {
    return cy.findByTestId('copy-suite-next-select-benchmarks');
  }

  findConfigurationStep() {
    return cy.findByTestId('copy-suite-step-benchmarks');
  }

  findContinueToRunButton() {
    return cy.findByTestId('single-benchmark-continue-to-run');
  }

  findBenchmarkThreshold() {
    return cy.findByTestId('benchmark-0-threshold');
  }

  findPrimaryMetricToggle() {
    return cy.findByTestId('benchmark-metric-toggle-0');
  }

  findPrimaryMetricOption(metric: string) {
    return cy.findByTestId(`benchmark-metric-option-0-${metric}`);
  }

  findTestDataRefSourceToggle() {
    return cy.findByTestId('benchmark-test-data-ref-0-source-toggle');
  }

  findTestDataRefOption(optionLabel: string) {
    return cy.findByRole('option', { name: optionLabel });
  }

  findTestDataRefField(field: string) {
    return cy.findByTestId(`benchmark-test-data-ref-0-${field}`);
  }

  findTestDataRefFieldError(field: string) {
    return cy.findByTestId(`benchmark-test-data-ref-0-${field}-error`);
  }
}

export const singleBenchmarkWizardPage = new SingleBenchmarkWizardPage();
