/* eslint-disable camelcase */
import { PipelineRunJobKFv2, PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';

class PipelineRunsRow extends TableRow {
  findCheckbox() {
    return this.find().find(`[data-label=Checkbox]`).find('input');
  }

  findColumnName(name: string) {
    return this.find().find(`[data-label=Name]`).contains(name);
  }

  findColumnVersion(name: string) {
    return this.find().find(`[data-label="Pipeline"]`).contains(name);
  }

  findStatusSwitchByRowName() {
    return this.find().findByTestId('job-status-switch');
  }
}
class PipelineRunsTable {
  protected testId = '';

  protected emptyStateTestId = '';

  constructor(tab?: 'active-runs' | 'archived-runs' | 'schedules') {
    this.testId = `${tab}-table`;
    this.emptyStateTestId = `${tab}-empty-state`;
  }

  find() {
    return cy.findByTestId(this.testId);
  }

  getRowByName(name: string) {
    return new PipelineRunsRow(() =>
      this.find().find(`[data-label=Name]`).contains(name).parents('tr'),
    );
  }

  shouldRowNotBeVisible(name: string) {
    this.find()
      .parents()
      .find('tr')
      .find(`[data-label=Name]`)
      .contains(name)
      .should('not.be.visible');
    return this;
  }

  findRows() {
    return this.find().find('[data-label=Name]').parents('tr');
  }

  findActionsKebab() {
    return cy.findByRole('button', { name: 'Actions' }).parent();
  }

  findEmptyState() {
    return cy.findByTestId(this.emptyStateTestId);
  }

  findEmptyResults() {
    return cy.findByTestId('no-result-found-title');
  }

  mockRestoreRun(runId: string, namespace: string) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/runs/${runId}:unarchive`,
      },
      (req) => {
        req.reply({ body: {} });
      },
    );
  }

  mockArchiveRun(runId: string, namespace: string) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/runs/${runId}:archive`,
      },
      (req) => {
        req.reply({ body: {} });
      },
    );
  }

  mockGetRuns(
    activeRuns: PipelineRunKFv2[],
    archivedRuns: PipelineRunKFv2[],
    namespace: string,
    times?: number,
  ) {
    return cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/runs`,
        ...(times && { times }),
      },
      (req) => {
        const {
          predicates: [{ string_value: runState }],
        } = JSON.parse(req.query.filter.toString());

        if (runState === 'ARCHIVED') {
          req.reply({ runs: archivedRuns, total_size: archivedRuns.length });
        } else {
          req.reply({ runs: activeRuns, total_size: activeRuns.length });
        }
      },
    );
  }
}

class ActiveRunsTable extends PipelineRunsTable {
  constructor() {
    super('active-runs');
  }

  mockGetActiveRuns(runs: PipelineRunKFv2[], namespace: string, times?: number) {
    return this.mockGetRuns(runs, [], namespace, times);
  }
}
class ArchivedRunsTable extends PipelineRunsTable {
  constructor() {
    super('archived-runs');
  }

  mockGetArchivedRuns(runs: PipelineRunKFv2[], namespace: string, times?: number) {
    return this.mockGetRuns([], runs, namespace, times);
  }
}

class PipelineRunJobTable extends PipelineRunsTable {
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
    return cy.findByTestId('schedules-table-toolbar').findByTestId('pipeline-filter-text-field');
  }

  findExperimentFilterSelect() {
    return cy.findByTestId('experiment-search-select');
  }

  mockGetJobs(jobs: PipelineRunJobKFv2[], namespace: string) {
    return cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/recurringruns`,
      },
      { recurringRuns: jobs, total_size: jobs.length },
    );
  }

  mockGetJob(job: PipelineRunJobKFv2, namespace: string) {
    return cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/recurringruns/${job.recurring_run_id}`,
      },
      job,
    );
  }

  mockEnableJob(job: PipelineRunJobKFv2, namespace: string) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/recurringruns/${job.recurring_run_id}:enable`,
      },
      {},
    );
  }

  mockDisableJob(job: PipelineRunJobKFv2, namespace: string) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/recurringruns/${job.recurring_run_id}:disable`,
      },
      {},
    );
  }
}

export const activeRunsTable = new ActiveRunsTable();
export const archivedRunsTable = new ArchivedRunsTable();
export const pipelineRunJobTable = new PipelineRunJobTable();
