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
    return cy.get('#display_name');
  }

  findDescriptionInput() {
    return cy.get('#description');
  }

  findNextButton() {
    return cy.findByRole('button', { name: 'Next' });
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
    return cy.get('input[type="file"]').first();
  }

  findUploadSpinner() {
    return cy.findByTestId('training-data-upload-spinner');
  }

  findBrowseBucketButton() {
    return cy.findByRole('button', { name: 'Browse bucket' });
  }

  // File Explorer Modal
  findFileExplorerSearch() {
    return cy.findByTestId('file-explorer-search').find('input');
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

  // Submit
  findCreateRunButton() {
    return cy.findByRole('button', { name: 'Create run' });
  }
}

class AutomlResultsPage {
  findStopRunButton() {
    return cy.findByTestId('stop-run-button');
  }

  findRunDetailsButton() {
    return cy.findByTestId('run-details-button');
  }
}

export const automlExperimentsPage = new AutomlExperimentsPage();
export const automlConfigurePage = new AutomlConfigurePage();
export const automlResultsPage = new AutomlResultsPage();
