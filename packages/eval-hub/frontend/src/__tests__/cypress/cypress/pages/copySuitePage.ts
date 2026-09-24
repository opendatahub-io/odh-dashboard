class CopySuitePage {
  visitCreate(namespace: string) {
    cy.visit(`/evaluation/${namespace}/create/collections/new`);
    this.waitForLoad();
  }

  visitCopy(namespace: string, collectionId: string) {
    cy.visit(`/evaluation/${namespace}/create/collections/${collectionId}/copy`);
    this.waitForLoad();
  }

  private waitForLoad() {
    cy.findByTestId('copy-suite-editor').should('exist');
  }

  findSuiteNameInput() {
    return cy.findByTestId('suite-name-input');
  }

  findSettingsNextButton() {
    return cy.findByTestId('copy-suite-next');
  }

  findSelectBenchmarksStep() {
    return cy.findByTestId('copy-suite-step-select-benchmarks');
  }

  findBenchmarkCheckbox(benchmarkId: string) {
    return cy.findByTestId(`benchmark-catalog-checkbox-${benchmarkId}`);
  }

  findBenchmarkName(benchmarkId: string) {
    return cy.findByTestId(`benchmark-catalog-name-${benchmarkId}`);
  }

  findSelectBenchmarksNextButton() {
    return cy.findByTestId('copy-suite-next-select-benchmarks');
  }

  findSelectBenchmarksBackButton() {
    return cy.findByTestId('copy-suite-back-select-benchmarks');
  }

  findConfigurationStep() {
    return cy.findByTestId('copy-suite-step-benchmarks');
  }

  findConfigurationBackButton() {
    return cy.findByTestId('copy-suite-back-step-2');
  }

  findDetailsDrawer() {
    return cy.findByTestId('copy-suite-benchmark-details-drawer');
  }
}

export const copySuitePage = new CopySuitePage();
