class EvaluationResultsPage {
  visit(namespace: string, jobId: string) {
    cy.visit(`/evaluation/${namespace}/results/${jobId}`);
    this.waitForLoad();
  }

  private waitForLoad() {
    cy.findByTestId('evaluation-results-content').should('exist');
    // Exclude aria-prohibited-attr: upstream PatternFly v6 bug on pf-v6-c-icon spans
    cy.testA11y({
      axeOptions: { rules: { 'aria-prohibited-attr': { enabled: false } } },
    });
  }

  findTitle() {
    return cy.findByTestId('evaluation-results-title');
  }

  findScoreValue() {
    return cy.findByTestId('evaluation-score-value');
  }

  findMetadata() {
    return cy.findByTestId('evaluation-metadata');
  }

  findViewLogButton() {
    return cy.findByTestId('view-log-button');
  }

  findEventLogModal() {
    return cy.findByTestId('evaluation-event-log-modal');
  }

  findDownloadLogsButton() {
    return cy.findByTestId('download-logs-button');
  }

  findBenchmarkLogSelector() {
    return cy.findByTestId('benchmark-log-selector');
  }

  findBenchmarkLogOption(name: string) {
    return cy.findByTestId(`benchmark-log-option-${name}`);
  }

  findBenchmarksGrid() {
    return cy.findByTestId('benchmarks-grid');
  }

  findBenchmarkCard(benchmarkId: string, index: number) {
    return cy.findByTestId(`benchmark-result-card-${benchmarkId}-${index}`);
  }

  findBenchmarkPassLabel(benchmarkId: string, index: number) {
    return cy.findByTestId(`benchmark-pass-label-${benchmarkId}-${index}`);
  }

  findViewMoreButton() {
    return cy.findByTestId('view-more-benchmarks');
  }

  findBenchmarkDetails(benchmarkId: string, benchmarkIndex: number) {
    return cy.findByTestId(`benchmark-details-${benchmarkId}-${benchmarkIndex}`);
  }

  findBenchmarkDetailsInfo() {
    return cy.findByTestId('benchmark-details-info');
  }
}

export const evaluationResultsPage = new EvaluationResultsPage();
