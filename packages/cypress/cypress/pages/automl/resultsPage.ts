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

  findRunInProgressMessage(timeout?: number) {
    return cy.findByTestId('automl-run-in-progress', timeout ? { timeout } : undefined);
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
    return cy.findByTestId('model-details-close');
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

  // ROC curve tab
  findROCCurveSection() {
    return cy.findByTestId('roc-curve-section');
  }

  findROCCurveChart() {
    return cy.findByTestId('roc-curve-chart');
  }

  findROCCurveNoData() {
    return cy.findByTestId('roc-curve-no-data');
  }

  // Precision-Recall tab
  findPrecisionRecallChart() {
    return cy.findByTestId('precision-recall-chart');
  }

  findPrecisionRecallNoData() {
    return cy.findByTestId('precision-recall-no-data');
  }

  // Back-testing tab
  findBacktestingContent() {
    return cy.findByTestId('backtest-window-content');
  }

  findBacktestingNoData() {
    return cy.findByTestId('backtest-window-no-data');
  }

  findBacktestMetricCard(key: string) {
    return cy.findByTestId(`metric-card-${key}`);
  }

  findBacktestMetricSelector() {
    return cy.findByTestId('metric-selector-toggle');
  }

  findBacktestWindowChart() {
    return cy.findByTestId('backtest-window-chart');
  }

  findForecastChart(title: string) {
    return cy.findByTestId(`forecast-chart-${title}`);
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

  findReconfigureButton() {
    return cy.findByTestId('reconfigure-run-button');
  }
}

export const automlResultsPage = new AutomlResultsPage();
