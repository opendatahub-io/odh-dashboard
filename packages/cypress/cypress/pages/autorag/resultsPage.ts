class AutoragResultsPage {
  findStopRunButton() {
    return cy.findByTestId('stop-run-button');
  }

  findRetryRunButton() {
    return cy.findByTestId('retry-run-button');
  }

  findRunDetailsButton() {
    return cy.findByTestId('run-details-button');
  }

  findRunInProgressMessage() {
    return cy.findByTestId('autorag-run-in-progress');
  }

  findRunStatusLabel(timeout?: number) {
    return cy.findByTestId('run-status-label', timeout ? { timeout } : undefined);
  }

  // Leaderboard
  findLeaderboardTable() {
    return cy.findByTestId('leaderboard-table');
  }

  findLeaderboardLoading() {
    return cy.findByTestId('leaderboard-loading');
  }

  findLeaderboardEmpty() {
    return cy.findByTestId('leaderboard-empty');
  }

  findManageColumnsButton() {
    return cy.findByTestId('manage-columns-button');
  }

  findManageColumnsModal() {
    return cy.findByRole('dialog');
  }

  findManageColumnsCancelButton() {
    return cy.findByRole('dialog').findByRole('button', { name: 'Cancel' });
  }

  findManageColumnsSaveButton() {
    return cy.findByRole('dialog').findByRole('button', { name: 'Save' });
  }

  findTopRankLabel() {
    return cy.findByTestId('top-rank-label');
  }

  findLeaderboardRow(rank: number) {
    return cy.findByTestId(`leaderboard-row-${rank}`);
  }

  findPatternLink(rank: number) {
    return cy.findByTestId(`pattern-link-${rank}`);
  }

  // Run details drawer
  findRunDetailsDrawerPanel() {
    return cy.findByTestId('run-details-drawer-panel');
  }

  findRunDetailsDrawerClose() {
    return cy.findByTestId('run-details-drawer-close');
  }

  // Stop run modal
  findStopRunModal() {
    return cy.findByTestId('stop-run-modal');
  }

  findConfirmStopRunButton() {
    return cy.findByTestId('confirm-stop-run-button');
  }

  // Pattern details modal
  findPatternDetailsModal() {
    return cy.findByTestId('pattern-details-modal');
  }

  findPatternDetailsModalCloseButton() {
    return this.findPatternDetailsModal().findByRole('button', { name: 'Close' });
  }

  findPatternSelectorDropdown() {
    return cy.findByTestId('pattern-selector-dropdown');
  }

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

  // Pattern details tabs
  findPatternDetailsTab(tabKey: string) {
    return cy.findByTestId(`tab-${tabKey}`);
  }

  // Runs table (experiments page)
  findRunsTable() {
    return cy.findByTestId('autorag-runs-table');
  }

  findRunLink(runId: string) {
    return cy.findByTestId(`run-name-${runId}`);
  }

  findStopRunAction() {
    return cy.findByTestId('stop-run-action');
  }

  findRetryRunAction() {
    return cy.findByTestId('retry-run-action');
  }

  /**
   * Waits up to `timeoutMs` (default 30 min) for the run to complete.
   * Asserts that the leaderboard table appears. Fails if a
   * canceled/failed status label appears instead.
   */
  waitForRunCompletion(timeoutMs = 1800000) {
    cy.findByTestId('autorag-run-in-progress', { timeout: timeoutMs }).should('not.exist');
    this.findRunStatusLabel().should('not.exist');
    this.findLeaderboardTable().should('be.visible');
    this.findTopRankLabel().should('exist');
  }

  // Score type radios (inside pattern details overview tab)
  findScoreTypeRadio(type: 'mean' | 'ci_high' | 'ci_low') {
    return cy.findByTestId(`score-type-${type}`);
  }

  /**
   * Runs the common post-run results verification flow:
   * - Leaderboard interaction (drawer, manage columns)
   * - Pattern details modal with all tabs
   * - Score type radio buttons
   * - Notebook downloads
   *
   * Pattern details tabs (dynamic, from AutoragPatternSettings):
   * | Tab                  | Key                  | Content                      |
   * |----------------------|----------------------|------------------------------|
   * | Pattern information  | pattern_information  | Key-value fields + scores    |
   * | Vector store         | vector_store         | Settings key-value list      |
   * | Chunking             | chunking             | Settings key-value list      |
   * | Embedding            | embedding            | Settings key-value list      |
   * | Retrieval            | retrieval            | Settings key-value list      |
   * | Generation           | generation           | Settings key-value list      |
   * | Sample Q&A           | sample_qa            | Conditional (eval results)   |
   */
  verifyResultsInteraction() {
    cy.step('Verify leaderboard has at least one pattern row');
    this.findLeaderboardRow(1).should('exist');

    cy.step('Open and close run details drawer');
    this.findRunDetailsButton().click();
    this.findRunDetailsDrawerPanel().should('be.visible');
    this.findRunDetailsDrawerClose().click();
    this.findRunDetailsDrawerPanel().should('not.be.visible');

    cy.step('Open manage columns modal and close it');
    this.findManageColumnsButton().click();
    this.findManageColumnsModal().should('be.visible');
    this.findManageColumnsCancelButton().click();
    this.findManageColumnsModal().should('not.exist');

    cy.step('Open pattern details modal for top-ranked pattern');
    this.findPatternLink(1).click();
    this.findPatternDetailsModal().should('be.visible');

    cy.step('Verify Pattern information tab (overview) is active by default');
    this.findPatternDetailsTab('pattern_information').should('exist');

    cy.step('Verify score type radio buttons on overview tab');
    this.findScoreTypeRadio('mean').should('exist');
    this.findScoreTypeRadio('ci_high').should('exist');
    this.findScoreTypeRadio('ci_low').should('exist');
    this.findScoreTypeRadio('ci_high').click();
    this.findScoreTypeRadio('mean').click();

    cy.step('Navigate to Vector store settings tab');
    this.findPatternDetailsTab('vector_store').should('exist').click();

    cy.step('Navigate to Chunking settings tab');
    this.findPatternDetailsTab('chunking').should('exist').click();

    cy.step('Navigate to Embedding settings tab');
    this.findPatternDetailsTab('embedding').should('exist').click();

    cy.step('Navigate to Retrieval settings tab');
    this.findPatternDetailsTab('retrieval').should('exist').click();

    cy.step('Navigate to Generation settings tab');
    this.findPatternDetailsTab('generation').should('exist').click();

    cy.step('Check if Sample Q&A tab exists (conditional on evaluation results)');
    this.findPatternDetailsModal().then(($modal) => {
      if ($modal.find('[data-testid="tab-sample_qa"]').length) {
        this.findPatternDetailsTab('sample_qa').click();
      }
    });

    cy.step('Close pattern details modal');
    this.findPatternDetailsModalCloseButton().click();
    this.findPatternDetailsModal().should('not.exist');

    cy.step('Download notebook (stub window.print)');
    this.findPatternLink(1).click();
    this.findPatternDetailsModal().should('be.visible');
    cy.window().then((win) => cy.stub(win, 'print'));
    this.findPatternDetailsDownload().click();
    cy.window().its('print').should('have.been.calledOnce');
    this.findPatternDetailsModalCloseButton().click();
    this.findPatternDetailsModal().should('not.exist');
  }
}

export const autoragResultsPage = new AutoragResultsPage();
