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

  findIsApiAvailable() {
    return cy.findByTestId('pipelines-api-available');
  }

  findIsServerIncompatible() {
    return cy.findByTestId('incompatible-pipelines-server');
  }

  selectProjectByName(name: string) {
    this.findProjectSelect().findDropdownItem(name).click();
  }
}

export const pipelinesGlobal = new PipelinesGlobal();
