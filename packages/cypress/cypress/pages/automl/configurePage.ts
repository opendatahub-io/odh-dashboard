import { automlExperimentsPage } from './experimentsPage';
import { automlResultsPage } from './resultsPage';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../utils/e2eUsers';
import { waitForDspaReady } from '../../utils/oc_commands/dspa';
import type { AutomlTestData } from '../../types';

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
  findUploadedFileCell() {
    return cy.findByTestId('uploaded-file-cell');
  }

  // Submit
  findCreateRunButton() {
    return cy.findByTestId('automl-create-run-button');
  }

  /**
   * Common setup for submitting an AutoML run.
   *
   * Handles: login, wait for DSPA, navigate to experiments, create run,
   * fill name/description, select S3 connection, and upload file.
   *
   * After this, configure task-specific options (task type, label column, etc.)
   * then call `submitRun()`.
   */
  submitRunSetup(testData: AutomlTestData, projectName: string, uuid: string) {
    cy.step('Login and wait for pipeline server');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    waitForDspaReady(projectName);

    cy.step('Navigate to AutoML experiments page');
    automlExperimentsPage.visit(projectName);

    cy.step('Wait for pipeline server to be fully ready and click Create run');
    automlExperimentsPage.findEmptyState(120000).should('exist');
    automlExperimentsPage.findCreateRunButton().click();

    cy.step('Step 1 - Fill name and description');
    cy.findByTestId('automl-name-input', { timeout: 30000 }).type(testData.runName);
    this.findDescriptionInput().type(testData.runDescription);
    this.findNextButton().click();

    cy.step('Verify configure step subtitle shows the run name');
    this.findConfigureStepSubtitle().should('contain.text', testData.runName);

    cy.step('Select S3 connection');
    this.findSecretSelector().click();
    this.findSecretSelector().type(testData.secretName);
    this.findSelectOption(new RegExp(testData.secretName, 'i')).click();

    cy.step('Upload CSV file');
    const uploadFileName = `${testData.trainingDataFile.replace('.csv', '')}-${uuid}.csv`;
    this.findUploadFileToggle().click();
    this.findUploadFileInput().selectFile(
      { contents: `resources/automl/${testData.trainingDataFile}`, fileName: uploadFileName },
      { force: true },
    );

    cy.step('Wait for upload to complete');
    this.findUploadSpinner().should('not.exist');
    this.findUploadedFileCell().should('be.visible');

    cy.step('Verify uploaded file is browsable in file explorer and select it');
    this.findSelectFileToggle().find('button').click();
    this.findBrowseBucketButton().click();
    this.findFileExplorerTable().should('be.visible');
    this.findFileExplorerSearch().type(uploadFileName);
    this.findFileExplorerTable().contains('td', uploadFileName).should('be.visible').click();
    this.findFileExplorerSelectBtn().click();
  }

  /**
   * Submit the AutoML run and verify redirect to results page.
   * Call after `submitRunSetup()` and task-specific configuration.
   */
  submitRun() {
    cy.step('Submit the form');
    this.findCreateRunButton().click();

    cy.step('Verify redirect to results page');
    cy.url().should('include', '/develop-train/automl/results/');

    cy.step('Verify the run is in progress');
    automlResultsPage.findRunInProgressMessage().should('be.visible');
  }
}

export const automlConfigurePage = new AutomlConfigurePage();
