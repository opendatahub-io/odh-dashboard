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

class CreateRunPage {
  private testId = 'create-run-page';

  find() {
    return cy.findByTestId(this.testId);
  }

  findNameInput() {
    return cy.findByRole('textbox', { name: 'Name' });
  }

  findDescriptionInput() {
    return cy.findByRole('textbox', { name: 'Description' });
  }

  findPipelineSelect() {
    return this.find().findByTestId('pipeline-toggle-button');
  }

  findPipelineVersionSelect() {
    return this.find().findByTestId('pipeline-version-toggle-button');
  }

  findTriggeredRunTypeRadioInput() {
    return this.find().findByRole('radio', { name: 'Run once immediately after creation' });
  }

  findScheduledRunTypeRadioInput() {
    return this.find().findByRole('radio', { name: 'Schedule recurring run' });
  }

  findSubmitButton() {
    return this.find().findByRole('button', { name: 'Create' });
  }

  fillName(value: string) {
    this.findNameInput().type(value);
  }

  fillDescription(value: string) {
    this.findDescriptionInput().type(value);
  }

  selectPipelineByName(name: string) {
    this.findPipelineSelect()
      .click()
      .get('[data-id="pipeline-selector-table-list"]')
      .findByText(name)
      .click();
  }

  selectPipelineVersionByName(name: string) {
    this.findPipelineVersionSelect()
      .click()
      .get('[data-id="pipeline-version-selector-table-list"]')
      .findByText(name)
      .click();
  }

  mockPipelines(pipelines: PipelineKF[]) {
    return cy.intercept(
      {
        pathname: '/api/proxy/apis/v1beta1/pipelines',
      },
      buildMockPipelines(pipelines),
    );
  }

  mockPipelineVersions(projectName: string, pipelineId: string, versions: PipelineVersionKF[]) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v1beta1/pipeline_versions',
      },
      (req) => {
        req.body = {
          path: '/apis/v1beta1/pipeline_versions',
          method: 'GET',
          host: `https://ds-pipeline-pipelines-definition-${projectName}.apps.user.com`,
          queryParams: {
            sort_by: 'created_at desc',
            page_size: 10,
            'resource_key.id': pipelineId,
            'resource_key.type': 'PIPELINE',
          },
        };

        req.reply(buildMockPipelineVersions(versions));
      },
    );
  }

  mockCreateRun(
    projectName: string,
    pipelineVersion: PipelineVersionKF,
    { id, name, description }: Partial<PipelineRunKF>,
  ) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v1beta1/runs',
        times: 1,
      },
      (req) => {
        req.body = {
          path: '/apis/v1beta1/runs',
          method: 'POST',
          host: `https://ds-pipeline-pipelines-definition-${projectName}.apps.ui-shared-odh.dev.datahub.redhat.com`,
          queryParams: {},
          data: {
            name,
            description,
            resource_references: [
              {
                key: { id: pipelineVersion.id, type: ResourceTypeKF.PIPELINE_VERSION },
                relationship: RelationshipKF.CREATOR,
              },
            ],
            pipeline_spec: {
              parameters: [],
            },
            service_account: '',
          },
        };

        req.reply({
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
        });
      },
    );
  }

  mockCreateJob(
    projectName: string,
    pipelineVersion: PipelineVersionKF,
    { id, name, description }: Partial<PipelineRunJobKF>,
  ) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v1beta1/jobs',
        times: 1,
      },
      (req) => {
        req.body = {
          path: '/apis/v1beta1/jobs',
          method: 'POST',
          host: `https://ds-pipeline-pipelines-definition-${projectName}.apps.ui-shared-odh.dev.datahub.redhat.com`,
          queryParams: {},
          data: {
            name,
            description,
            resource_references: [
              {
                key: { id: pipelineVersion.id, type: ResourceTypeKF.PIPELINE_VERSION },
                relationship: RelationshipKF.CREATOR,
              },
            ],
            pipeline_spec: {
              parameters: [],
            },
            max_concurrency: '10',
            enabled: true,
            trigger: { periodic_schedule: { interval_second: '604800' } },
          },
        };

        req.reply({
          id,
          name,
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
        });
      },
    );
  }

  submit() {
    this.findSubmitButton().click();
  }
}

export const createRunPage = new CreateRunPage();
