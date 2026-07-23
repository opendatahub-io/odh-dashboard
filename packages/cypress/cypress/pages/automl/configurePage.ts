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
  findNameInput(timeout?: number) {
    return cy.findByTestId('automl-name-input', timeout ? { timeout } : undefined);
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
  findFileExplorerSearch(timeout?: number) {
    return cy.findByTestId('file-explorer-search', timeout ? { timeout } : undefined);
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

  // Target column (shared across all task types)
  findTargetColumnSelect() {
    return cy.findByTestId('target_column-select');
  }

  findTimestampColumnSelect() {
    return cy.findByTestId('timestamp_column-select');
  }

  findIdColumnSelect() {
    return cy.findByTestId('id_column-select');
  }

  // Preset
  findPresetRadio(preset: string) {
    return cy.findByTestId(`preset-radio-${preset}`);
  }

  // Optimization metric
  findOptimizationMetricCard() {
    return cy.findByTestId('optimization-metric-card');
  }

  findOptimizationMetricValue() {
    return cy.findByTestId('optimization-metric-value');
  }

  findOptimizationMetricEditButton() {
    return cy.findByTestId('optimization-metric-edit');
  }

  findOptimizationMetricModal() {
    return cy.findByTestId('optimization-metric-modal');
  }

  findEvalMetricRadio(metric: string) {
    return cy.findByTestId(`eval-metric-radio-${metric}`);
  }

  findOptimizationMetricSaveButton() {
    return cy.findByTestId('optimization-metric-save');
  }

  // Top N models
  findTopNInput() {
    return cy.findByTestId('top-n-input');
  }

  findTopNInputField() {
    return this.findTopNInput().find('input');
  }

  findSelectOption(name: string | RegExp) {
    return cy.findByRole('option', { name: name instanceof RegExp ? name : new RegExp(name) });
  }

  // Upload result
  findUploadedFileCell(timeout?: number) {
    return cy.findByTestId('uploaded-file-cell', timeout ? { timeout } : undefined);
  }

  // Submit
  findCreateRunButton() {
    return cy.findByTestId('automl-create-run-button');
  }
}

export const automlConfigurePage = new AutomlConfigurePage();
