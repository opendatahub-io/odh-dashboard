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

  // ColumnManagementModal is a PF component — scope selectors within the dialog
  findManageColumnsDescription() {
    return cy
      .findByRole('dialog')
      .findByText('Selected categories will be displayed in the table.');
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
    // PF Modal renders the close button internally — no closeButtonProps available
    return cy.findByTestId('automl-model-details-modal').findByRole('button', { name: 'Close' });
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

  findConfusionMatrixGradient() {
    return cy.findByTestId('confusion-matrix-gradient');
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
