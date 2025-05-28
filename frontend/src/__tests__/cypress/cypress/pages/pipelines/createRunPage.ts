/* eslint-disable camelcase */
import type {
  ArgoWorkflowPipelineVersion,
  CreatePipelineVersionKFData,
  ExperimentKF,
  PipelineKF,
  PipelineRecurringRunKF,
  PipelineRunKF,
  PipelineVersionKF,
} from '#~/concepts/pipelines/kfTypes';
import { buildMockRunKF } from '#~/__mocks__';
import { buildMockPipelines } from '#~/__mocks__/mockPipelinesProxy';
import {
  buildMockPipelineVersion,
  buildMockPipelineVersions,
} from '#~/__mocks__/mockPipelineVersionsProxy';
import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';
import { buildMockRecurringRunKF } from '#~/__mocks__/mockRecurringRunKF';
import { SearchSelector } from '#~/__tests__/cypress/cypress/pages/components/subComponents/SearchSelector';

class ParamsSection extends Contextual<HTMLElement> {
  findParamById(id: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(id);
  }

  fillParamInputById(id: string, value: string): void {
    this.findParamById(id).clear();
    this.findParamById(id).type(value, { parseSpecialCharSequences: false });
  }
}
export class CreateRunPage {
  protected testId = 'create-run-page';

  private type;

  experimentSelect = new SearchSelector('experiment-selector');

  pipelineSelect = new SearchSelector('pipeline-selector');

  pipelineVersionSelect = new SearchSelector('pipeline-version-selector');

  constructor(type: 'run' | 'schedule') {
    this.type = type;
  }

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(this.testId);
  }

  private findNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('run-name');
  }

  private findDescriptionInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('run-description');
  }

  findProjectNavigatorLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('project-navigator-link');
  }

  findRunTypeSwitchLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('run-type-section-alert-link');
  }

  findPipelineVersionByName(name: string): Cypress.Chainable<JQuery<HTMLTableCellElement>> {
    return this.find()
      .document()
      .findByTestId('pipeline-version-selector-table-list')
      .find('td')
      .contains(name);
  }

  findPipelineCreateVersionButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('import-pipeline-version-button');
  }

  findScheduledRunTypeSelector(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('triggerTypeSelector');
  }

  findScheduledRunTypeSelectorPeriodic(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('option', { name: 'Periodic' });
  }

  findScheduledRunTypeSelectorCron(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('option', { name: 'Cron' });
  }

  findScheduledRunRunEvery(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('run-every-group');
  }

  findScheduledRunCron(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('cron-string-group');
  }

  findMaxConcurrencyField(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('maxConcurrencyField');
  }

  findMaxConcurrencyFieldValue(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return this.findMaxConcurrencyField().find('input');
  }

  findMaxConcurrencyFieldMinus(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findMaxConcurrencyField().findByRole('button', { name: 'Minus' });
  }

  findMaxConcurrencyFieldPlus(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findMaxConcurrencyField().findByRole('button', { name: 'Plus' });
  }

  findStartDatePickerSwitch(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().pfSwitch('start-date-toggle');
  }

  findEndDatePickerSwitch(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().pfSwitch('end-date-toggle');
  }

  findCatchUpSwitch(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().pfSwitch('run-catch-up-toggle');
  }

  findCatchUpSwitchValue(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().pfSwitchValue('run-catch-up-toggle');
  }

  private findDatePickerDate(id: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(`${id}-date`);
  }

  findStartDatePickerDate(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findDatePickerDate('start-date');
  }

  findEndDatePickerDate(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findDatePickerDate('end-date');
  }

  private findDatePickerTime(id: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(`${id}-time`);
  }

  findStartDatePickerTime(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findDatePickerTime('start-date');
  }

  findEndDatePickerTime(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findDatePickerTime('end-date');
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('run-page-submit-button');
  }

  findUseLatestVersionRadio(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('use-latest-version-radio');
  }

  findViewLatestVersionButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('view-latest-version-button');
  }

  findViewLatestVersionPopover(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('view-latest-version-popover');
  }

  findUseFixedVersionRadio(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('use-fixed-version-radio');
  }

  findPipelineNotSelectedAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('pipeline-not-selected-alert');
  }

  findNoPipelineVersionsAvailableAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('no-pipeline-versions-available-alert');
  }

  getParamsSection(): ParamsSection {
    return new ParamsSection(() => cy.findByTestId('run-section-params'));
  }

  fillName(value: string): void {
    this.findNameInput().clear().type(value);
  }

  fillDescription(value: string): void {
    this.findDescriptionInput().clear().type(value);
  }

  selectExperimentByName(name: string): void {
    cy.findByTestId('experiment-selector-table-list').find('td').contains(name).click();
  }

  selectPipelineByName(name: string): void {
    cy.findByTestId('pipeline-selector-table-list').find('td').contains(name).click();
  }

  mockGetExperiments(namespace: string, experiments: ExperimentKF[]): Cypress.Chainable<null> {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments',
      {
        path: { namespace, serviceName: 'dspa' },
      },
      (req) => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { filter, sort_by, page_size } = req.query;
        let results = experiments;
        if (sort_by) {
          const fields = sort_by.toString().split(' ');
          const sortField = fields[0];
          const sortDirection = fields[1];
          // more fields to be added
          if (sortField === 'created_at') {
            if (sortDirection === 'desc') {
              results = results.toSorted(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              );
            } else {
              results = results.toSorted(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              );
            }
          }
        }
        if (filter) {
          const { predicates } = JSON.parse(decodeURIComponent(filter.toString()));

          if (predicates.length > 0) {
            predicates.forEach((predicate: { key: string; string_value: string }) => {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              const { key, string_value } = predicate;
              if (key === 'storage_state') {
                results = results.filter((experiment) => experiment.storage_state === string_value);
              }
              if (key === 'name') {
                results = results.filter((experiment) =>
                  experiment.display_name.includes(string_value),
                );
              }
            });
          }
        }

        if (page_size) {
          results = results.slice(0, Number(page_size));
        }

        req.reply({ experiments: results, total_size: results.length });
      },
    );
  }

  mockGetPipelines(namespace: string, pipelines: PipelineKF[]): Cypress.Chainable<null> {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
      {
        path: { namespace, serviceName: 'dspa' },
      },
      buildMockPipelines(pipelines),
    );
  }

  mockGetPipelineVersions(
    namespace: string,
    versions: (PipelineVersionKF | ArgoWorkflowPipelineVersion)[],
    pipelineId: string,
  ): Cypress.Chainable<null> {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
      { path: { namespace, serviceName: 'dspa', pipelineId } },
      buildMockPipelineVersions(versions),
    );
  }

  mockCreateRun(
    namespace: string,
    pipelineVersion: PipelineVersionKF,
    { run_id, ...run }: Partial<PipelineRunKF>,
  ): Cypress.Chainable<null> {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs',
      {
        path: { namespace, serviceName: 'dspa' },
        times: 1,
      },
      (req) => {
        const data = {
          pipeline_version_reference: {
            pipeline_id: pipelineVersion.pipeline_id,
            pipeline_version_id: pipelineVersion.pipeline_version_id,
          },
          ...run,
        };

        expect(req.body.display_name).to.equal(run.display_name);
        expect(JSON.stringify(req.body.runtime_config)).to.equal(
          JSON.stringify(run.runtime_config),
        );
        req.reply(buildMockRunKF({ ...data, run_id }));
      },
    );
  }

  mockCreateRecurringRun(
    namespace: string,
    pipelineVersion: PipelineVersionKF,
    { recurring_run_id, ...recurringRun }: Partial<PipelineRecurringRunKF>,
  ): Cypress.Chainable<null> {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns',
      { path: { namespace, serviceName: 'dspa' }, times: 1 },
      (req) => {
        const data = {
          display_name: recurringRun.display_name,
          description: recurringRun.description,
          pipeline_version_reference: {
            pipeline_id: pipelineVersion.pipeline_id,
            pipeline_version_id: pipelineVersion.pipeline_version_id,
          },
          ...recurringRun,
        };

        expect(req.body.display_name).to.equal(recurringRun.display_name);
        expect(JSON.stringify(req.body.runtime_config)).to.equal(
          JSON.stringify(recurringRun.runtime_config),
        );
        req.reply(buildMockRecurringRunKF({ ...data, recurring_run_id }));
      },
    );
  }

  mockCreatePipelineVersion(
    namespace: string,
    params: CreatePipelineVersionKFData,
  ): Cypress.Chainable<null> {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/upload_version',
      {
        path: { namespace, serviceName: 'dspa' },
        query: {
          pipelineid: params.pipeline_id,
          name: params.display_name,
          description: params.description,
        },
        times: 1,
      },

      buildMockPipelineVersion(params),
    );
  }

  submit(): void {
    this.findSubmitButton().click();
  }
}

export const createRunPage = new CreateRunPage('run');
export const createSchedulePage = new CreateRunPage('schedule');
