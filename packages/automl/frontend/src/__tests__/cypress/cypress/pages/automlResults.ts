class AutomlResultsPage {
  visit(namespace: string, runId: string) {
    cy.visit(`/results/${namespace}/${runId}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('leaderboard-table');
    cy.testA11y();
  }

  // Leaderboard
  findLeaderboardTable() {
    return cy.findByTestId('leaderboard-table');
  }

  findLeaderboardRow(rank: number) {
    return cy.findByTestId(`leaderboard-row-${rank}`);
  }

  findTopRankLabel() {
    return cy.findByTestId('top-rank-label');
  }

  findMetricHeader(metric: string) {
    return cy.findByTestId(`metric-header-${metric}`);
  }

  findManageColumnsButton() {
    return cy.findByTestId('manage-columns-button');
  }

  findManageColumnsDescription() {
    return cy.findByTestId('manage-columns-modal');
  }

  findColumnCheck(column: string) {
    return cy.findByTestId(`column-check-${column}`);
  }

  findManageColumnsSaveButton() {
    return cy.findByRole('dialog').findByRole('button', { name: 'Save' });
  }

  // Model links
  findModelLink(rank: number) {
    return cy.findByTestId(`model-link-${rank}`);
  }

  // Model Details Modal
  findModelDetailsModal() {
    return cy.findByTestId('automl-model-details-modal');
  }

  findModelDetailsModalCloseButton() {
    return cy.findByTestId('model-details-close');
  }

  findModelSelectorDropdown() {
    return cy.findByTestId('model-selector-dropdown');
  }

  findModelSelectorOption(name: string) {
    return cy.findByRole('menuitem', { name: new RegExp(name) });
  }

  findTab(tabName: string) {
    return cy.findByTestId(`tab-${tabName}`);
  }

  // Feature Summary
  findFeatureImportanceBar(feature: string) {
    return cy.findByTestId(`feature-importance-bar-${feature}`);
  }

  findFeatureSearchInput() {
    return cy.findByTestId('feature-search-input');
  }

  // Confusion Matrix
  findConfusionMatrixTable() {
    return cy.findByTestId('confusion-matrix-table');
  }

  findConfusionMatrixLegend() {
    return cy.findByTestId('confusion-matrix-legend');
  }

  // Run Details Drawer
  findRunDetailsButton() {
    return cy.findByTestId('run-details-button');
  }

  findRunDetailsDrawerPanel() {
    return cy.findByTestId('run-details-drawer-panel');
  }

  findRunDetailsDrawerCloseButton() {
    return cy.findByTestId('run-details-drawer-close');
  }
}

export const automlResultsPage = new AutomlResultsPage();
