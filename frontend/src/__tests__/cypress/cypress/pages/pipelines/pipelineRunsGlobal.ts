class PipelineRunsGlobal {
  private testId = 'pipeline-runs-global-page';

  visit(projectName: string) {
    cy.visitWithLogin(`/pipelineRuns/${projectName}`);
    this.find();
  }

  find() {
    return cy.findByTestId(this.testId);
  }

  findScheduledTab() {
    return cy.findByRole('tab', { name: 'Scheduled runs tab' });
  }

  findTriggeredTab() {
    return cy.findByRole('tab', { name: 'Triggered runs tab' });
  }

  findProjectSelect() {
    return this.find().findByTestId('project-selector-dropdown');
  }

  selectProjectByName(name: string) {
    this.findProjectSelect().findDropdownItem(name).click();
  }
}

export const pipelineRunsGlobal = new PipelineRunsGlobal();
