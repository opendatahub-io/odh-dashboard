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

  findEmptyState() {
    return cy.findByTestId('empty-experiments-state');
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

  // Step 2 - Configure details panel
  findTaskTypeCard(type: string) {
    return cy.findByTestId(`task-type-card-${type}`);
  }

  findLabelColumnSelect() {
    return cy.findByTestId('label_column-select');
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

  findRunDetailsButton() {
    return cy.findByTestId('run-details-button');
  }

  findRunInProgressMessage() {
    return cy.findByTestId('automl-run-in-progress');
  }
}

export const automlExperimentsPage = new AutomlExperimentsPage();
export const automlConfigurePage = new AutomlConfigurePage();
export const automlResultsPage = new AutomlResultsPage();
