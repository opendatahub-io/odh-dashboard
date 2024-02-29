import { DeleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';

class PipelinesGlobal {
  visit(projectName: string) {
    cy.visitWithLogin(`/pipelines/${projectName}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').contains('Pipelines');
    cy.testA11y();
  }

  findImportPipelineButton() {
    return cy.findByRole('button', { name: 'Import pipeline' });
  }

  findUploadVersionButton() {
    cy.findByLabelText('Import pipeline and pipeline version button').click();
    return cy.findByRole('menuitem').get('span').contains('Upload new version');
  }

  findProjectSelect() {
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
    cy.findByTestId('global-pipelines-kebab-actions').click();
    return cy.findAllByRole('menuitem').get('a').contains('Delete selected');
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
