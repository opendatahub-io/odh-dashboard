class PipelinesGlobal {
  private testId = 'pipelines-table';

  visit(projectName: string) {
    cy.visitWithLogin(`/pipelines/${projectName}`);
    this.find();
  }

  find() {
    return cy.findByTestId(this.testId);
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

  selectProjectByName(name: string) {
    this.findProjectSelect().findDropdownItem(name).click();
  }
}

export const pipelinesGlobal = new PipelinesGlobal();
