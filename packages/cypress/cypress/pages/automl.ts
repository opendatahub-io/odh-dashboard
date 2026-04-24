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
    this.findTopNInput().find('input').clear().type(`${value}`);
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

  findRunStatusLabel() {
    return cy.findByTestId('run-status-label');
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

  findTopRankLabel() {
    return cy.findByTestId('top-rank-label');
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
    this.findRunInProgressMessage().should('not.exist', { timeout: timeoutMs });
    // Verify no failure/canceled status label appeared
    this.findRunStatusLabel().should('not.exist');
    // Verify the leaderboard table loaded with results
    this.findLeaderboardTable().should('be.visible');
    this.findTopRankLabel().should('exist');
  }
}

export const automlExperimentsPage = new AutomlExperimentsPage();
export const automlConfigurePage = new AutomlConfigurePage();
export const automlResultsPage = new AutomlResultsPage();
