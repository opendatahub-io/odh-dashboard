class AutoragConfigurePage {
  visit(namespace: string) {
    cy.visitWithLogin(`/gen-ai-studio/autorag/configure/${namespace}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  // Step 1 - Create
  findNameInput(options?: Partial<Cypress.Loggable & Cypress.Timeoutable>) {
    return cy.findByTestId('autorag-name-input', options);
  }

  findDescriptionInput() {
    return cy.findByTestId('autorag-description-input');
  }

  findOgxSecretSelector() {
    return cy.findByTestId('ogx-secret-selector');
  }

  findAddOgxConnectionButton() {
    return cy.findByTestId('add-ogx-connection-button');
  }

  findNextButton() {
    return cy.findByTestId('autorag-next-button');
  }

  findConfigureStepSubtitle() {
    return cy.findByTestId('configure-step-subtitle');
  }

  // Step 2 - Documents panel
  findSecretSelector() {
    return cy.findByTestId('aws-secret-selector');
  }

  findSelectFileToggle() {
    return cy.findByTestId('input-data-source-select-toggle');
  }

  findUploadFileToggle() {
    return cy.findByTestId('input-data-source-upload-toggle');
  }

  findUploadFileInput() {
    return cy.findByTestId('autorag-upload-file-input');
  }

  findUploadSpinner() {
    return cy.findByTestId('input-data-upload-spinner');
  }

  findBrowseBucketButton() {
    return cy.findByTestId('browse-bucket-button');
  }

  // File Explorer
  findFileExplorerSearch() {
    return cy.findByTestId('file-explorer-search');
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

  // Step 2 - Model selection
  findModelSelectionSection() {
    return cy.findByTestId('model-selection-section');
  }

  findModelTable(modelType: 'llm' | 'embedding') {
    return cy.findByTestId(`${modelType}-models-table`);
  }

  findModelRow(modelId: string) {
    return cy.findByTestId(`model-row-${modelId}`);
  }

  // Step 2 - Vector store
  findVectorStoreSelector() {
    return cy.findByTestId('vector-store-select-toggle');
  }

  findVectorStoreOption(providerId: string) {
    return cy.findByTestId(`vector-store-option-${providerId}`);
  }

  findFirstVectorStoreOption() {
    return cy.findByTestId('vector-store-select-list').find('li').first();
  }

  // Step 2 - Optimization
  findOptimizationMetricSelect() {
    return cy.findByTestId('optimization-metric-select');
  }

  findMetricOption(value: string) {
    return cy.findByTestId(`metric-option-${value}`);
  }

  findMaxRagPatternsInput() {
    return cy.findByTestId('max-rag-patterns-input');
  }

  findMaxRagPatternsInputField() {
    return this.findMaxRagPatternsInput().find('input');
  }

  // Step 2 - Experiment settings
  findExperimentSettingsModal() {
    return cy.findByTestId('experiment-settings-modal');
  }

  findExperimentSettingsSave() {
    return cy.findByTestId('experiment-settings-save');
  }

  findExperimentSettingsCancel() {
    return cy.findByTestId('experiment-settings-cancel');
  }

  findSelectOption(name: string | RegExp) {
    return cy.findByRole('option', { name: name instanceof RegExp ? name : new RegExp(name) });
  }

  // Evaluation dataset — PF FileUpload renders input with id from field.name
  findEvaluationFileInput() {
    return cy.findByTestId('evaluation-file-selector').find('input[type="file"]');
  }

  // Uploaded file table
  findUploadedFileCell() {
    return cy.findByTestId('uploaded-file-cell');
  }

  // Submit
  findCreateRunButton() {
    return cy.findByTestId('autorag-create-run-button');
  }
}

export const autoragConfigurePage = new AutoragConfigurePage();
