/* eslint-disable camelcase */
import type { PipelineRecurringRunKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';

class PipelineRunsRow extends TableRow {
  findCheckbox() {
    return this.find().find(`[data-label=Checkbox]`).find('input');
  }

  findColumnName(name: string) {
    return this.find().find(`[data-label=Name]`).contains(name);
  }
}

class PipelineRunTableRow extends PipelineRunsRow {
  findKebabAction(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    this.find().findKebab().click();
    return cy.findByTestId('pipeline-run-table-row-actions').findByRole('menuitem', { name });
  }
}

class PipelineRecurringRunTableRow extends PipelineRunsRow {
  findStatusSwitchByRowName() {
    return this.find().findByTestId('recurring-run-status-switch');
  }

  shouldHaveToggleDisabled() {
    this.findStatusSwitchByRowName().find('input').should('have.attr', 'disabled');
    return this;
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
    return cy.findByRole('button', { name: 'Actions' });
  }

  findEmptyState() {
    return cy.findByTestId(this.emptyStateTestId);
  }

  findEmptyResults() {
    return cy.findByTestId('no-result-found-title');
  }

  mockRestoreRun(runId: string, namespace: string) {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
      { path: { namespace, serviceName: 'dspa', runId: `${runId}:unarchive` } },
      (req) => {
        req.reply({ body: {} });
      },
    );
  }

  mockArchiveRun(runId: string, namespace: string) {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
      { path: { namespace, serviceName: 'dspa', runId: `${runId}:archive` } },
      (req) => {
        req.reply({ body: {} });
      },
    );
  }

  mockGetRuns(
    activeRuns: PipelineRunKF[],
    archivedRuns: PipelineRunKF[],
    namespace: string,
    times?: number,
  ) {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs',
      {
        path: { namespace, serviceName: 'dspa' },
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

  mockGetActiveRuns(runs: PipelineRunKF[], namespace: string, times?: number) {
    return this.mockGetRuns(runs, [], namespace, times);
  }

  getRowByName(name: string) {
    return new PipelineRunTableRow(() =>
      this.find().find(`[data-label=Name]`).contains(name).parents('tr'),
    );
  }
}
class ArchivedRunsTable extends PipelineRunsTable {
  constructor() {
    super('archived-runs');
  }

  mockGetArchivedRuns(runs: PipelineRunKF[], namespace: string, times?: number) {
    return this.mockGetRuns([], runs, namespace, times);
  }

  getRowByName(name: string) {
    return new PipelineRunTableRow(() =>
      this.find().find(`[data-label=Name]`).contains(name).parents('tr'),
    );
  }
}

class PipelineRecurringRunTable extends PipelineRunsTable {
  constructor() {
    super('schedules');
  }

  getRowByName(name: string) {
    return new PipelineRecurringRunTableRow(() =>
      this.find().find(`[data-label=Name]`).contains(name).parents('tr'),
    );
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

  mockGetRecurringRuns(recurringRuns: PipelineRecurringRunKF[], namespace: string) {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns',
      { path: { namespace, serviceName: 'dspa' } },
      { recurringRuns, total_size: recurringRuns.length },
    );
  }

  mockGetRecurringRun(recurringRun: PipelineRecurringRunKF, namespace: string) {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId',
      { path: { namespace, serviceName: 'dspa', recurringRunId: recurringRun.recurring_run_id } },
      recurringRun,
    );
  }

  mockEnableRecurringRun(recurringRun: PipelineRecurringRunKF, namespace: string) {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId',
      {
        path: {
          namespace,
          serviceName: 'dspa',
          recurringRunId: `${recurringRun.recurring_run_id}:'enable'`,
        },
      },
      {},
    );
  }

  mockDisableRecurringRun(recurringRun: PipelineRecurringRunKF, namespace: string) {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId',
      {
        path: {
          namespace,
          serviceName: 'dspa',
          recurringRunId: `${recurringRun.recurring_run_id}:disable`,
        },
      },
      {},
    );
  }
}

export const activeRunsTable = new ActiveRunsTable();
export const archivedRunsTable = new ArchivedRunsTable();
export const pipelineRecurringRunTable = new PipelineRecurringRunTable();
