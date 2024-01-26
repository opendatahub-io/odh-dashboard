import { PipelineRunJobKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';

class PipelineRunTable {
  protected testId = '';
  protected toolbarTestId = '';

  constructor(testId = 'pipeline-run-table', toolbarTestId = 'run-table-toolbar-item') {
    this.testId = testId;
    this.toolbarTestId = toolbarTestId;
  }

  find() {
    return cy.findByTestId(this.testId);
  }

  findRowByName(name: string) {
    return this.find().findAllByRole('link', { name }).parents('tr');
  }

  findActionsKebab() {
    return cy.findByTestId(this.toolbarTestId).findByTestId('run-table-toolbar-actions');
  }

  findEmptyState() {
    return cy.findByTestId('create-run-empty-state');
  }

  mockRuns(runs: PipelineRunKF[]) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v1beta1/runs',
      },
      { runs },
    );
  }
}

class PipelineRunJobTable extends PipelineRunTable {
  constructor(testId = 'pipeline-run-job-table', toolbarTestId = 'job-table-toolbar-item') {
    super(testId, toolbarTestId);
  }

  mockJobs(jobs: PipelineRunJobKF[]) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v1beta1/jobs',
      },
      { jobs },
    );
  }
}

export const pipelineRunTable = new PipelineRunTable();
export const pipelineRunJobTable = new PipelineRunJobTable();
