class AutoragRunResultsPage {
  visit(namespace: string, runId: string) {
    cy.visit(`/gen-ai-studio/autorag/results/${namespace}/${runId}`);
  }

  findLeaderboardTable() {
    return cy.findByTestId('leaderboard-table');
  }

  findMetricHeader(metricName: string) {
    return cy.findByTestId(`metric-header-${metricName}`);
  }

  findPatternLink(rank: number) {
    return cy.findByTestId(`pattern-link-${rank}`);
  }

  findPatternDetailsModal() {
    return cy.findByTestId('pattern-details-modal');
  }

  findCIScoresChart() {
    return cy.findByTestId('ci-scores-chart');
  }

  findCIScoresInfo() {
    return cy.findByTestId('ci-scores-info');
  }

  findCIMetricHelp(metricKey: string) {
    return cy.findByTestId(`ci-metric-help-${metricKey}`);
  }

  findPatternDetailsTab(tabKey: string) {
    return cy.findByTestId(`tab-${tabKey}`);
  }

  findMetricGroup(evaluator: string) {
    return cy.findByTestId(`qa-metric-group-${evaluator}`);
  }
}

export const autoragRunResultsPage = new AutoragRunResultsPage();
