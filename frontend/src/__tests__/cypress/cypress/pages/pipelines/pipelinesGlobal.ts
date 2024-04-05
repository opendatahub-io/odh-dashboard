import { DeleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';

class PipelinesGlobal {
  visit(projectName: string) {
    cy.visit(`/pipelines/${projectName}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').contains('Pipelines');
    cy.testA11y();
  }

  findImportPipelineButton() {
    return cy.findByTestId('import-pipeline-button');
  }

  findUploadVersionButton() {
    cy.findByTestId('import-pipeline-split-button').click();
    return cy.findByRole('menuitem').get('span').contains('Upload new version');
  }

  private findProjectSelect() {
    return cy.findByTestId('project-selector-dropdown');
  }

  isApiAvailable() {
    return cy.findByTestId('pipelines-api-not-available').should('not.exist');
  }

  findIsServerIncompatible() {
    return cy.findByTestId('incompatible-pipelines-server');
  }

  selectProjectByName(name: string) {
    this.findProjectSelect().findDropdownItem(name).click();
  }

  findDeleteButton() {
    return cy.findByTestId('global-pipelines-kebab-actions').findDropdownItem('Delete');
  }
}

class PipelineDeleteModal extends DeleteModal {
  constructor() {
    super();
  }

  find() {
    return cy.findByTestId('delete-pipeline-modal').parents('div[role="dialog"]');
  }
}

export const pipelineDeleteModal = new PipelineDeleteModal();
export const pipelinesGlobal = new PipelinesGlobal();
