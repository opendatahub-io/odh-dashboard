class EvaluationResultsPage {
  findResultsTitle() {
    return cy.findByTestId('evaluation-results-title');
  }

  findResultsContent() {
    return cy.findByTestId('evaluation-results-content');
  }

  findMetadata() {
    return cy.findByTestId('evaluation-metadata');
  }

  findViewLogButton() {
    return cy.findByTestId('view-log-button');
  }

  findScoreSection() {
    return cy.findByTestId('evaluation-score-section');
  }

  findScoreValue() {
    return cy.findByTestId('evaluation-score-value');
  }

  findBenchmarksGrid() {
    return cy.findByTestId('benchmarks-grid');
  }

  findViewMoreButton() {
    return cy.findByTestId('view-more-benchmarks');
  }

  findBenchmarkResultCard(benchmarkId: string, index: number) {
    return cy.findByTestId(`benchmark-result-card-${benchmarkId}-${index}`);
  }

  findBenchmarkScore(benchmarkId: string, index: number) {
    return cy.findByTestId(`benchmark-score-${benchmarkId}-${index}`);
  }

  findBenchmarkPassLabel(benchmarkId: string, index: number) {
    return cy.findByTestId(`benchmark-pass-label-${benchmarkId}-${index}`);
  }

  findBenchmarkDetails(benchmarkId: string, benchmarkIndex: number) {
    return cy.findByTestId(`benchmark-details-${benchmarkId}-${benchmarkIndex}`);
  }

  findBenchmarkDetailsInfo() {
    return cy.findByTestId('benchmark-details-info');
  }

  findBenchmarkProviderLabel() {
    return cy.findByTestId('benchmark-provider-label');
  }

  findEventLogModal() {
    return cy.findByTestId('evaluation-event-log-modal');
  }
}

export const evaluationResultsPage = new EvaluationResultsPage();
