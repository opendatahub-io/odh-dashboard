import { appChrome } from './appChrome';

class AutomlExperimentsPage {
  visit(namespace: string) {
    cy.visitWithLogin(`/develop-train/automl/experiments/${namespace}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem({ name: 'AutoML', rootSection: 'Develop & train' });
  }

  findEmptyState(timeout?: number) {
    return cy.findByTestId('empty-experiments-state', timeout ? { timeout } : undefined);
  }

  findCreateRunButton() {
    return cy.findByTestId('create-run-button');
  }

  findHeaderCreateRunButton() {
    return cy.findByTestId('automl-header-create-experiment-button');
  }
}

class AutomlConfigurePage {
  visit(namespace: string) {
    cy.visitWithLogin(`/develop-train/automl/configure/${namespace}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  // Step 1 - Create
  findNameInput() {
    return cy.findByTestId('automl-name-input');
  }

  findDescriptionInput() {
    return cy.findByTestId('automl-description-input');
  }

  findNextButton() {
    return cy.findByTestId('automl-next-button');
  }

  findConfigureStepSubtitle() {
    return cy.findByTestId('configure-step-subtitle');
  }

  // Step 2 - Documents panel
  findSecretSelector() {
    return cy.findByTestId('aws-secret-selector');
  }

  findSelectFileToggle() {
    return cy.findByTestId('training-data-source-select-toggle');
  }

  findUploadFileToggle() {
    return cy.findByTestId('training-data-source-upload-toggle');
  }

  findUploadFileInput() {
    return cy.findByTestId('automl-upload-file-input');
  }

  findUploadSpinner() {
    return cy.findByTestId('training-data-upload-spinner');
  }

  findUploadRemoveAction() {
    return cy.findByTestId('training-data-upload-remove');
  }

  findUploadReplaceAction() {
    return cy.findByTestId('training-data-upload-replace');
  }

  findBrowseBucketButton() {
    return cy.findByTestId('browse-bucket-button');
  }

  // File Explorer Modal
  findFileExplorerSearch() {
    return cy.findByTestId('file-explorer-search-input');
  }

  findFileExplorerTable() {
    return cy.findByTestId('file-explorer-table');
  }

  findFileExplorerRow(filePath: string) {
    const sanitized = filePath.replace(/[^a-zA-Z0-9-_]/g, '-');
    return cy.findByTestId(`file-explorer-row-${sanitized}`);
  }

  findFileExplorerSelectBtn() {
    return cy.findByTestId('file-explorer-select-btn');
  }

  findFileExplorerCancelBtn() {
    return cy.findByTestId('file-explorer-cancel-btn');
  }

  // Step 2 - Configure details panel
  findTaskTypeCard(type: string) {
    return cy.findByTestId(`task-type-card-${type}`);
  }

  // Tabular fields (binary, multiclass, regression)
  findLabelColumnSelect() {
    return cy.findByTestId('label_column-select');
  }

  // Timeseries fields
  findTargetColumnSelect() {
    return cy.findByTestId('target-select');
  }

  findTimestampColumnSelect() {
    return cy.findByTestId('timestamp_column-select');
  }

  findIdColumnSelect() {
    return cy.findByTestId('id_column-select');
  }

  findKnownCovariatesSelect() {
    return cy.findByTestId('known_covariates_names-select');
  }

  findPredictionLengthInput() {
    return cy.findByTestId('prediction-length-input');
  }

  // Top N models
  findTopNInput() {
    return cy.findByTestId('top-n-input');
  }

  setTopN(value: number) {
    this.findTopNInput().find('input').type(`{selectall}${value}`);
  }

  findSelectOption(name: string | RegExp) {
    return cy.findByRole('option', { name: name instanceof RegExp ? name : new RegExp(name) });
  }

  // Upload result
  findUploadedFileCell(pattern: RegExp) {
    return cy.contains('td', pattern);
  }

  // Submit
  findCreateRunButton() {
    return cy.findByTestId('automl-create-run-button');
  }
}

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
    this.findModelDetailsModal().find('button[aria-label="Close"]').click();
    this.findModelDetailsModal().should('not.exist');

    cy.step('Download notebook (stub window.print)');
    this.findModelLink(1).click();
    this.findModelDetailsModal().should('be.visible');
    cy.window().then((win) => cy.stub(win, 'print'));
    this.findModelDetailsDownloadButton().click();
    cy.window().its('print').should('have.been.calledOnce');
    this.findModelDetailsModal().find('button[aria-label="Close"]').click();
    this.findModelDetailsModal().should('not.exist');
  }
}

export const automlExperimentsPage = new AutomlExperimentsPage();
export const automlConfigurePage = new AutomlConfigurePage();
export const automlResultsPage = new AutomlResultsPage();
