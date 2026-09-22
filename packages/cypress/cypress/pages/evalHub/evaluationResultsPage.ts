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

  findBenchmarkResultCards() {
    return this.findBenchmarksGrid().find('[data-testid^="benchmark-result-card-"]');
  }

  findBenchmarkResultCardById(benchmarkId: string) {
    return this.findBenchmarksGrid().find(`[data-testid^="benchmark-result-card-${benchmarkId}-"]`);
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

  findAboutResultButton(benchmarkId: string, index: number) {
    return cy.findByTestId(`about-result-${benchmarkId}-${index}`);
  }

  findFirstAboutResultButton() {
    return cy.get('[data-testid^="about-result-"]').first();
  }

  findAboutResultDialog() {
    return cy.findByRole('dialog');
  }

  findAboutResultCloseButton() {
    return this.findAboutResultDialog().findByRole('button', { name: 'Close' });
  }

  findEventLogModal() {
    return cy.findByTestId('evaluation-event-log-modal');
  }

  findEventLogModalCloseButton() {
    return this.findEventLogModal().findByRole('button', { name: 'Close' });
  }

  findLogContent() {
    return cy.findByTestId('log-content');
  }

  findLogTailNotice() {
    return cy.findByTestId('log-tail-notice');
  }
}

export const evaluationResultsPage = new EvaluationResultsPage();
