class AutoragResultsPage {
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
    return cy
      .get('[role="dialog"]')
      .contains('Selected categories will be displayed in the table.');
  }

  findColumnCheck(column: string) {
    return cy.get(`[data-testid="column-check-${column}"]`);
  }

  findManageColumnsSaveButton() {
    return cy.get('[role="dialog"]').contains('button', 'Save');
  }

  // Pattern links
  findPatternLink(rank: number) {
    return cy.findByTestId(`pattern-link-${rank}`);
  }

  // Pattern Details Modal
  findPatternDetailsModal() {
    return cy.findByTestId('pattern-details-modal');
  }

  findPatternDetailsModalCloseButton() {
    return cy.findByTestId('pattern-details-modal').findByRole('button', { name: 'Close' });
  }

  findPatternSelectorDropdown() {
    return cy.findByTestId('pattern-selector-dropdown');
  }

  findPatternSelectorOption(name: string) {
    // formatPatternName inserts \u00a0 between prefix and trailing digits
    const pattern = name.replace(/(\D)(\d)/, '$1.?$2');
    return cy.get('[role="menuitem"]').contains(new RegExp(pattern));
  }

  findTab(tabKey: string) {
    return cy.findByTestId(`tab-${tabKey}`);
  }

  // Score type radios (overview tab)
  findScoreTypeRadio(type: string) {
    return cy.findByTestId(`score-type-${type}`);
  }

  // Score progress bars
  findScoreProgress(metric: string) {
    return cy.findByTestId(`score-progress-${metric}`);
  }

  // Pattern details download / notebooks
  findPatternDetailsDownload() {
    return cy.findByTestId('pattern-details-download');
  }

  findSaveNotebookToggle() {
    return cy.findByTestId('pattern-details-save-notebook-toggle');
  }

  findSaveIndexingNotebook() {
    return cy.findByTestId('pattern-details-save-indexing-notebook');
  }

  findSaveInferenceNotebook() {
    return cy.findByTestId('pattern-details-save-inference-notebook');
  }

  // Sample Q&A entries
  findQAEntry(questionId: string) {
    return cy.findByTestId(`qa-entry-${questionId}`);
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

export const autoragResultsPage = new AutoragResultsPage();
