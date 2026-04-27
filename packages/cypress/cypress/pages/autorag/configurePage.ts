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

  findUploadFileInput() {
    return cy.findByTestId('training-data-source-upload-toggle');
  }

  findUploadSpinner() {
    return cy.findByTestId('input-data-upload-spinner');
  }

  findBrowseBucketButton() {
    return cy.contains('button', 'Browse bucket');
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
  submitRunSetup(testData: AutoragTestData, projectName: string) {
    cy.step('Login and wait for pipeline server');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    waitForDspaReady(projectName);

    cy.step('Navigate to AutoRAG experiments page');
    autoragExperimentsPage.visit(projectName);

    cy.step('Wait for pipeline server to be fully ready and click Create run');
    autoragExperimentsPage.findEmptyState(120000).should('exist');
    autoragExperimentsPage.findCreateRunButton().click();

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

    cy.step('Browse and select a document from S3');
    this.findBrowseBucketButton().click();
    this.findFileExplorerTable().should('be.visible');
    this.findFileExplorerTable().find('tbody tr').first().click();
    this.findFileExplorerSelectBtn().click();

    cy.step('Select first available LLM model');
    this.findModelTable('llm').should('be.visible');
    this.findModelTable('llm').find('tbody tr').first().find('input[type="checkbox"]').check();

    cy.step('Select first available embedding model');
    this.findModelTable('embedding').should('be.visible');
    this.findModelTable('embedding')
      .find('tbody tr')
      .first()
      .find('input[type="checkbox"]')
      .check();

    cy.step('Select first available vector store');
    this.findVectorStoreSelector().click();
    cy.findByTestId('vector-store-select-list').find('li').first().click();
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
