class PipelineRunJobTable {
  private testId = 'pipeline-run-job-table';

  find() {
    return cy.findByTestId(this.testId);
  }
}

export const pipelineRunJobTable = new PipelineRunJobTable();
