class ChooseCompareBenchmarksPage {
  visit(namespace: string, jobIds: string[]) {
    const search = new URLSearchParams({ jobIds: jobIds.join(',') });
    cy.visit(`/evaluation/${namespace}/compare-runs/benchmarks?${search.toString()}`);
    this.waitForLoad();
  }

  private waitForLoad() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTitle() {
    return cy.findByTestId('app-page-title');
  }

  findBenchmarkSelectionTable() {
    return cy.findByTestId('choose-compare-benchmarks-table');
  }

  findSearchInput() {
    return cy.findByTestId('choose-compare-benchmarks-search');
  }

  findCompareButton() {
    return cy.findByTestId('compare-selected-benchmarks-button');
  }

  findRunGroupRow(jobId: string) {
    return cy.findByTestId(`compare-run-row-${jobId}`);
  }

  findBenchmarkCheckbox(selectionKey: string) {
    return cy.findByTestId(`compare-benchmark-checkbox-${selectionKey}`);
  }
}

export const chooseCompareBenchmarksPage = new ChooseCompareBenchmarksPage();
