/* eslint-disable camelcase */
import {
  PipelineKF,
  PipelineRunJobKF,
  PipelineRunKF,
  PipelineVersionKF,
  RelationshipKF,
  ResourceTypeKF,
} from '~/concepts/pipelines/kfTypes';
import { buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import { buildMockPipelineVersions } from '~/__mocks__/mockPipelineVersionsProxy';

export class CreateRunPage {
  protected testId = 'create-run-page';

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(this.testId);
  }

  findNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('textbox', { name: 'Name' });
  }

  findDescriptionInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('textbox', { name: 'Description' });
  }

  findPipelineSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('pipeline-toggle-button');
  }

  findPipelineVersionSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('pipeline-version-toggle-button');
  }

  findTriggeredRunTypeRadioInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('radio', { name: 'Run once immediately after creation' });
  }

  findScheduledRunTypeRadioInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('radio', { name: 'Schedule recurring run' });
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: 'Create' });
  }

  fillName(value: string): void {
    this.findNameInput().type(value);
  }

  fillDescription(value: string): void {
    this.findDescriptionInput().type(value);
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

  mockGetPipelines(pipelines: PipelineKF[], namespace: string): Cypress.Chainable<null> {
    return cy.intercept(
      {
        pathname: `/api/service/pipelines/${namespace}/pipelines-definition/apis/v1beta1/pipelines`,
      },
      buildMockPipelines(pipelines),
    );
  }

  mockGetPipelineVersions(
    versions: PipelineVersionKF[],
    namespace: string,
  ): Cypress.Chainable<null> {
    return cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${namespace}/pipelines-definition/apis/v1beta1/pipeline_versions`,
      },
      buildMockPipelineVersions(versions),
    );
  }

  mockCreateRun(
    pipelineVersion: PipelineVersionKF,
    { id, name, description }: Partial<PipelineRunKF>,
    namespace: string,
  ): Cypress.Chainable<null> {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/service/pipelines/${namespace}/pipelines-definition/apis/v1beta1/runs`,
        times: 1,
      },
      {
        run: {
          id,
          name,
          description,
          pipeline_spec: {
            workflow_manifest: '',
            parameters: [],
          },
          resource_references: [
            {
              key: { id: pipelineVersion.id, type: ResourceTypeKF.PIPELINE_VERSION },
              name: pipelineVersion.name,
              relationship: RelationshipKF.CREATOR,
            },
            {
              key: { type: ResourceTypeKF.EXPERIMENT, id: 'default-experiment-id' },
              name: 'Default',
              relationship: RelationshipKF.OWNER,
            },
          ],
          service_account: 'pipeline-runner-pipelines-definition',
          created_at: '2024-01-26T17:12:19Z',
          scheduled_at: '1970-01-01T00:00:00Z',
          finished_at: '1970-01-01T00:00:00Z',
        },
        pipeline_runtime: {
          workflow_manifest: '',
        },
      },
    );
  }

  mockCreateJob(
    pipelineVersion: PipelineVersionKF,
    { id, name, description }: Partial<PipelineRunJobKF>,
    namespace: string,
  ): Cypress.Chainable<null> {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/service/pipelines/${namespace}/pipelines-definition/apis/v1beta1/jobs`,
        times: 1,
      },
      {
        id,
        name,
        description,
        pipeline_spec: {
          workflow_manifest: '',
          parameters: [],
        },
        resource_references: [
          {
            key: { id: pipelineVersion.id, type: ResourceTypeKF.PIPELINE_VERSION },
            name: pipelineVersion.name,
            relationship: RelationshipKF.CREATOR,
          },
          {
            key: { type: ResourceTypeKF.EXPERIMENT, id: 'default-experiment-id' },
            name: 'Default',
            relationship: RelationshipKF.OWNER,
          },
        ],
        service_account: 'pipeline-runner-pipelines-definition',
        max_concurrency: '10',
        trigger: { periodic_schedule: { interval_second: '604800' } },
        created_at: '2024-01-26T17:49:13Z',
        updated_at: '2024-01-26T17:49:13Z',
        status: 'NO_STATUS',
        enabled: true,
      },
    );
  }

  submit(): void {
    this.findSubmitButton().click();
  }
}

export const createRunPage = new CreateRunPage();
