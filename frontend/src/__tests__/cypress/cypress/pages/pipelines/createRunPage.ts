/* eslint-disable camelcase */
import {
  ExperimentKFv2,
  PipelineKFv2,
  PipelineRunJobKFv2,
  PipelineRunKFv2,
  PipelineVersionKFv2,
} from '~/concepts/pipelines/kfTypes';
import { buildMockExperiments, buildMockJobKF, buildMockRunKF } from '~/__mocks__';
import { buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import { buildMockPipelineVersionsV2 } from '~/__mocks__/mockPipelineVersionsProxy';

export class CreateRunPage {
  protected testId = 'create-run-page';

  private type;

  constructor(type: 'run' | 'schedule') {
    this.type = type;
  }

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(this.testId);
  }

  findNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('textbox', { name: 'Name' });
  }

  findDescriptionInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('textbox', { name: 'Description' });
  }

  findExperimentSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('experiment-toggle-button');
  }

  findPipelineSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('pipeline-toggle-button');
  }

  findPipelineVersionSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('pipeline-version-toggle-button');
  }

  findScheduledRunTypeSelector(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('triggerTypeSelector');
  }

  findScheduledRunTypeSelectorPeriodic(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('menuitem', { name: 'Periodic' });
  }

  findScheduledRunTypeSelectorCron(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('menuitem', { name: 'Cron' });
  }

  findScheduledRunRunEvery(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByText('Run every');
  }

  findScheduledRunCron(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByText('Cron string');
  }

  findMaxConcurrencyField(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('maxConcurrencyField');
  }

  findMaxConcurrencyFieldValue(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findMaxConcurrencyField().findByLabelText('Input');
  }

  findMaxConcurrencyFieldMinus(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findMaxConcurrencyField().findByLabelText('Minus');
  }

  findMaxConcurrencyFieldPlus(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findMaxConcurrencyField().findByLabelText('Plus');
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
    return this.find().findByRole('button', {
      name: `${this.type === 'schedule' ? 'Schedule' : 'Create'} run`,
    });
  }

  findParamByLabel(label: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByLabelText(label);
  }

  fillName(value: string): void {
    this.findNameInput().type(value);
  }

  fillDescription(value: string): void {
    this.findDescriptionInput().type(value);
  }

  fillParamInputByLabel(label: string, value: string): void {
    this.findParamByLabel(label).clear();
    this.findParamByLabel(label).type(value);
  }

  selectExperimentByName(name: string): void {
    this.findExperimentSelect()
      .click()
      .get('[data-id="experiment-selector-table-list"]')
      .findByText(name)
      .click();
  }

  selectPipelineByName(name: string): void {
    this.findPipelineSelect()
      .click()
      .get('[data-id="pipeline-selector-table-list"]')
      .findByText(name)
      .click();
  }

  selectPipelineVersionByName(name: string): void {
    this.findPipelineVersionSelect()
      .click()
      .get('[data-id="pipeline-version-selector-table-list"]')
      .findByText(name)
      .click();
  }

  mockGetExperiments(experiments?: ExperimentKFv2[]): Cypress.Chainable<null> {
    return cy.intercept(
      { pathname: '/api/proxy/apis/v2beta1/experiments' },
      buildMockExperiments(experiments),
    );
  }

  mockGetPipelines(pipelines: PipelineKFv2[]): Cypress.Chainable<null> {
    return cy.intercept(
      {
        pathname: '/api/proxy/apis/v2beta1/pipelines',
      },
      buildMockPipelines(pipelines),
    );
  }

  mockGetPipelineVersions(
    versions: PipelineVersionKFv2[],
    pipelineId: string,
  ): Cypress.Chainable<null> {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/pipelines/${pipelineId}/versions`,
      },
      buildMockPipelineVersionsV2(versions),
    );
  }

  mockCreateRun(
    pipelineVersion: PipelineVersionKFv2,
    { run_id, ...run }: Partial<PipelineRunKFv2>,
  ): Cypress.Chainable<null> {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v2beta1/runs',
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

        expect(req.body.data.display_name).to.equal(run.display_name);
        expect(JSON.stringify(req.body.data.runtime_config)).to.equal(
          JSON.stringify(run.runtime_config),
        );
        req.reply(buildMockRunKF({ ...data, run_id }));
      },
    );
  }

  mockCreateRecurringRun(
    pipelineVersion: PipelineVersionKFv2,
    { recurring_run_id, ...recurringRun }: Partial<PipelineRunJobKFv2>,
  ): Cypress.Chainable<null> {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v2beta1/recurringruns',
        times: 1,
      },
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

        expect(req.body.data.display_name).to.equal(recurringRun.display_name);
        expect(JSON.stringify(req.body.data.runtime_config)).to.equal(
          JSON.stringify(recurringRun.runtime_config),
        );
        req.reply(buildMockJobKF({ ...data, recurring_run_id }));
      },
    );
  }

  submit(): void {
    this.findSubmitButton().click();
  }
}

export const createRunPage = new CreateRunPage('run');
export const createSchedulePage = new CreateRunPage('schedule');
