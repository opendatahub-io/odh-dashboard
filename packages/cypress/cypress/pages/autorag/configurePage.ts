import { autoragExperimentsPage } from './experimentsPage';
import { autoragResultsPage } from './resultsPage';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../utils/e2eUsers';
import { waitForDspaReady } from '../../utils/oc_commands/dspa';
import type { AutoragTestData } from '../../types';

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
  findNameInput() {
    return cy.findByTestId('autorag-name-input');
  }

  findDescriptionInput() {
    return cy.findByTestId('autorag-description-input');
  }

  findLlamaStackSecretSelector() {
    return cy.findByTestId('lls-secret-selector');
  }

  findAddLlsConnectionButton() {
    return cy.findByTestId('add-lls-connection-button');
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

  setMaxRagPatterns(value: number) {
    this.findMaxRagPatternsInput().find('input').type(`{selectall}${value}`);
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

  /**
   * Common setup for submitting an AutoRAG run.
   *
   * Handles: login, wait for DSPA, navigate to experiments, create run,
   * fill name/description, select LlamaStack secret, select S3 connection,
   * upload document, and select first available models + vector store.
   *
   * After this, optionally configure metric/patterns, then call `submitRun()`.
   */
  submitRunSetup(testData: AutoragTestData, projectName: string, uuid: string) {
    cy.step('Login and wait for pipeline server');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    waitForDspaReady(projectName);

    cy.step('Navigate to AutoRAG experiments page');
    autoragExperimentsPage.visit(projectName);

    cy.step('Wait for pipeline server to be fully ready and click Create run');
    // Pipeline server startup can take up to 2 minutes on first provisioning
    cy.findByTestId('app-page-title', { timeout: 120000 }).should('be.visible');
    // Use header button if runs already exist, otherwise empty state button
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="autorag-header-create-run-button"]').length) {
        autoragExperimentsPage.findHeaderCreateRunButton().click();
      } else {
        autoragExperimentsPage.findEmptyState().should('exist');
        autoragExperimentsPage.findCreateRunButton().click();
      }
    });

    cy.step('Step 1 - Fill name and description');
    this.findNameInput().type(testData.runName);
    this.findDescriptionInput().type(testData.runDescription);

    cy.step('Step 1 - Select LlamaStack secret');
    this.findLlamaStackSecretSelector().click();
    this.findLlamaStackSecretSelector().type(testData.llamaStackSecretName);
    this.findSelectOption(new RegExp(testData.llamaStackSecretName, 'i')).click();

    cy.step('Click Next to go to Configure step');
    this.findNextButton().click();

    cy.step('Verify configure step subtitle shows the run name');
    this.findConfigureStepSubtitle().should('contain.text', testData.runName);

    cy.step('Select S3 connection');
    this.findSecretSelector().click();
    this.findSecretSelector().type(testData.s3SecretName);
    this.findSelectOption(new RegExp(testData.s3SecretName, 'i')).click();

    cy.step('Upload document file');
    const uploadFileName = `${testData.documentFile.replace('.txt', '')}-${uuid}.txt`;
    this.findUploadFileToggle().click();
    this.findUploadFileInput().selectFile(
      { contents: `resources/autorag/${testData.documentFile}`, fileName: uploadFileName },
      { force: true },
    );

    cy.step('Wait for upload to complete');
    this.findUploadSpinner().should('not.exist');
    this.findUploadedFileCell().should('be.visible');

    cy.step('Verify uploaded file is browsable in file explorer and select it');
    this.findSelectFileToggle().click();
    this.findBrowseBucketButton().click();
    this.findFileExplorerTable().should('be.visible');
    this.findFileExplorerSearch().type(uploadFileName);
    this.findFileExplorerTable().contains('td', uploadFileName).should('be.visible').click();
    this.findFileExplorerSelectBtn().click();

    cy.step('Upload evaluation dataset JSON');
    const evalFileName = `${testData.evaluationFile.replace('.json', '')}-${uuid}.json`;
    this.findEvaluationFileInput().selectFile(
      { contents: `resources/autorag/${testData.evaluationFile}`, fileName: evalFileName },
      { force: true },
    );

    cy.step('Select first available vector store');
    this.findVectorStoreSelector().click();
    this.findFirstVectorStoreOption().click();
  }

  /**
   * Submit the AutoRAG run and verify redirect to results page.
   * Call after `submitRunSetup()` and any custom configuration.
   */
  submitRun() {
    cy.step('Submit the form');
    this.findCreateRunButton().click();

    cy.step('Verify redirect to results page');
    cy.url().should('include', '/gen-ai-studio/autorag/results/');

    cy.step('Verify the run is in progress');
    autoragResultsPage.findRunInProgressMessage().should('be.visible');
  }
}

export const autoragConfigurePage = new AutoragConfigurePage();
