/* eslint-disable camelcase */
import { PipelineRunJobKFv2, PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';

class PipelineRunTable {
  protected testId = '';

  protected emptyStateTestId = '';

  constructor(tab?: 'active-runs' | 'archived-runs' | 'schedules') {
    this.testId = `${tab}-table`;
    this.emptyStateTestId = `${tab}-empty-state`;
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
    return cy.findByRole('button', { name: 'Actions' }).parent();
  }

  findEmptyState() {
    return cy.findByTestId(this.emptyStateTestId);
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
        method: 'POST',
        pathname: '/api/proxy/apis/v2beta1/runs',
        ...(times && { times }),
      },
      { runs, total_size: runs.length },
    );
  }
}

class PipelineRunJobTable extends PipelineRunTable {
  constructor() {
    super('schedules');
  }

  findEmptyState() {
    return cy.findByTestId('schedules-empty-state');
  }

  selectFilterByName(name: string) {
    cy.findByTestId('schedules-table-toolbar')
      .findByTestId('pipeline-filter-dropdown')
      .findDropdownItem(name)
      .click();
  }

  findFilterTextField() {
    return cy
      .findByTestId('schedules-table-toolbar')
      .findByTestId('run-table-toolbar-filter-text-field');
  }

  findExperimentFilterSelect() {
    return cy.findByTestId('experiment-search-select');
  }

  findStatusSwitchByRowName(name: string) {
    return this.findRowByName(name).findByTestId('job-status-switch');
  }

  mockGetJobs(jobs: PipelineRunJobKFv2[]) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v2beta1/recurringruns',
      },
      { recurringRuns: jobs, total_size: jobs.length },
    );
  }

  mockGetJob(job: PipelineRunJobKFv2) {
    return cy.intercept(
      {
        method: 'GET',
        pathname: `/api/proxy/apis/v2beta1/recurringruns/${job.recurring_run_id}`,
      },
      job,
    );
  }

  mockEnableJob(job: PipelineRunJobKFv2) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/recurringruns/${job.recurring_run_id}:enable`,
      },
      {},
    );
  }

  mockDisableJob(job: PipelineRunJobKFv2) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/recurringruns/${job.recurring_run_id}:disable`,
      },
      {},
    );
  }
}

export const activeRunsTable = new PipelineRunTable('active-runs');
export const archivedRunsTable = new PipelineRunTable('archived-runs');
export const pipelineRunJobTable = new PipelineRunJobTable();
