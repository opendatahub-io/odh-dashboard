class PipelineRunTable {
  private testId = 'pipeline-run-table';

  find() {
    return cy.findByTestId(this.testId);
  }
}

export const pipelineRunTable = new PipelineRunTable();
