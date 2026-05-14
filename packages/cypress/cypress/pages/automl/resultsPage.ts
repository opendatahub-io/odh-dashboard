class AutomlResultsPage {
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
    return cy.findByTestId('automl-run-in-progress');
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

  findColumnCheck(column: string) {
    return cy.findByTestId(`column-check-${column}`);
  }

  findMetricHeader(metric: string) {
    return cy.findByTestId(`metric-header-${metric}`);
  }

  findTopRankLabel() {
    return cy.findByTestId('top-rank-label');
  }

  findLeaderboardRow(rank: number) {
    return cy.findByTestId(`leaderboard-row-${rank}`);
  }

  findModelLink(rank: number) {
    return cy.findByTestId(`model-link-${rank}`);
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

  // Model details modal
  findModelDetailsModal() {
    return cy.findByTestId('automl-model-details-modal');
  }

  findModelDetailsModalCloseButton() {
    return this.findModelDetailsModal().findByRole('button', { name: 'Close' });
  }

  findModelSelectorDropdown() {
    return cy.findByTestId('model-selector-dropdown');
  }

  findModelDetailsDownloadButton() {
    return cy.findByTestId('model-details-download');
  }

  findModelDetailsActionsToggle() {
    return cy.findByTestId('model-details-actions-toggle');
  }

  findRegisterModelAction() {
    return cy.findByTestId('model-details-register-model');
  }

  findSaveNotebookAction() {
    return cy.findByTestId('model-details-save-notebook');
  }

  // Model details modal tabs
  findModelDetailsTab(tabKey: string) {
    return cy.findByTestId(`tab-${tabKey}`);
  }

  // Feature summary tab
  findFeatureSearchInput() {
    return cy.findByTestId('feature-search');
  }

  // Confusion matrix tab
  findConfusionMatrixTable() {
    return cy.findByTestId('confusion-matrix-table');
  }

  findConfusionMatrixGradient() {
    return cy.findByTestId('confusion-matrix-gradient');
  }

  // Register model modal
  findRegisterModelModal() {
    return cy.findByTestId('register-model-modal');
  }

  findRegistrySelectToggle() {
    return cy.findByTestId('registry-select-toggle');
  }

  findRegistryOption(name: string) {
    return cy.findByTestId(`registry-option-${name}`);
  }

  findRegisterModelNameInput() {
    return cy.findByTestId('model-name-input');
  }

  findRegisterModelDescriptionInput() {
    return cy.findByTestId('model-description-input');
  }

  findRegisterModelSubmitButton() {
    return cy.findByTestId('register-model-submit');
  }

  findRegisterModelCancelButton() {
    return cy.findByTestId('register-model-cancel');
  }

  findRegisterModelError() {
    return cy.findByTestId('register-model-error');
  }

  // Runs table
  findRunsTable() {
    return cy.findByTestId('automl-runs-table');
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
    // Wait for in-progress message to disappear (run finished)
    cy.findByTestId('automl-run-in-progress', { timeout: timeoutMs }).should('not.exist');
    // Verify no failure/canceled status label appeared
    this.findRunStatusLabel().should('not.exist');
    // Verify the leaderboard table loaded with results
    this.findLeaderboardTable().should('be.visible');
    this.findTopRankLabel().should('exist');
  }

  /**
   * Runs the common post-run results verification flow:
   * - Leaderboard interaction (drawer, manage columns)
   * - Model details modal (tab navigation based on task type)
   * - Download notebook (with window.print stub)
   *
   * Tab visibility per task type:
   * | Tab                | binary | multiclass | regression | timeseries |
   * |--------------------|--------|------------|------------|------------|
   * | model-information  | yes    | yes        | yes        | yes        |
   * | feature-summary    | yes    | yes        | yes        | no         |
   * | model-evaluation   | yes    | yes        | yes        | yes        |
   * | confusion-matrix   | yes    | yes        | no         | no         |
   */
  verifyResultsInteraction(taskType: 'binary' | 'multiclass' | 'regression' | 'timeseries') {
    const isClassification = taskType === 'binary' || taskType === 'multiclass';
    const isTimeseries = taskType === 'timeseries';

    cy.step('Verify leaderboard has at least one model row');
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

    cy.step('Open model details modal');
    this.findModelLink(1).click();
    this.findModelDetailsModal().should('be.visible');

    cy.step('Verify expected tabs are present');
    this.findModelDetailsTab('model-information').should('exist');
    this.findModelDetailsTab('model-evaluation').should('exist');

    if (!isTimeseries) {
      this.findModelDetailsTab('feature-summary').should('exist');
      this.findModelDetailsTab('feature-summary').click();
      this.findFeatureSearchInput().should('be.visible');
    } else {
      this.findModelDetailsTab('feature-summary').should('not.exist');
    }

    if (isClassification) {
      this.findModelDetailsTab('confusion-matrix').should('exist');
      this.findModelDetailsTab('confusion-matrix').click();
      this.findConfusionMatrixTable().should('be.visible');
    } else {
      this.findModelDetailsTab('confusion-matrix').should('not.exist');
    }

    cy.step('Close model details modal');
    this.findModelDetailsModalCloseButton().click();
    this.findModelDetailsModal().should('not.exist');

    cy.step('Download notebook (stub window.print)');
    this.findModelLink(1).click();
    this.findModelDetailsModal().should('be.visible');
    cy.window().then((win) => cy.stub(win, 'print'));
    this.findModelDetailsDownloadButton().click();
    cy.window().its('print').should('have.been.calledOnce');
    this.findModelDetailsModalCloseButton().click();
    this.findModelDetailsModal().should('not.exist');
  }
}

export const automlResultsPage = new AutomlResultsPage();
