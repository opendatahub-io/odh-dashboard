/* eslint-disable camelcase */
import { PipelineRunJobKF, PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';

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

  findRows() {
    return this.find().find('[data-label=Name]').parents('tr');
  }

  findRowKebabByName(name: string) {
    return this.findRowByName(name).findByRole('button', { name: 'Kebab toggle' });
  }

  findActionsKebab() {
    return cy.findByTestId(this.toolbarTestId).findByTestId('run-table-toolbar-actions');
  }

  findEmptyState() {
    return cy.findByTestId('create-run-empty-state');
  }

  findEmptyResults() {
    return cy.findByRole('heading', { name: 'No results found' });
  }

  selectRowActionByName(rowName: string, actionName: string) {
    this.findRowKebabByName(rowName).click();
    cy.findByRole('menu').get('span').contains(actionName).parents('button').click();
  }

  mockGetRuns(runs: PipelineRunKFv2[], times?: number) {
    return cy.intercept(
      {
        times,
        method: 'POST',
        pathname: '/api/proxy/apis/v2beta1/runs',
      },
      { runs, total_size: runs.length },
    );
  }
}

class PipelineRunJobTable extends PipelineRunTable {
  constructor(testId = 'pipeline-run-job-table', toolbarTestId = 'job-table-toolbar-item') {
    super(testId, toolbarTestId);
  }

  mockGetJobs(jobs: PipelineRunJobKF[]) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v1beta1/jobs',
      },
      { jobs, total_size: jobs.length },
    );
  }
}

export const pipelineRunTable = new PipelineRunTable();
export const pipelineRunJobTable = new PipelineRunJobTable();
