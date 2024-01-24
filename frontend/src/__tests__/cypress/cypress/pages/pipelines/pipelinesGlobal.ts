class PipelinesGlobal {
  private testId = 'pipelines-global-page';

  visit(projectName: string) {
    cy.visitWithLogin(`/pipelines/${projectName}`);
    this.find();
  }

  find() {
    return cy.findByTestId(this.testId);
  }

  findProjectSelect() {
    return this.find().findByTestId('project-selector-dropdown');
  }

  selectProjectByName(name: string) {
    this.findProjectSelect().findDropdownItem(name).click();
  }
}

export const pipelinesGlobal = new PipelinesGlobal();
