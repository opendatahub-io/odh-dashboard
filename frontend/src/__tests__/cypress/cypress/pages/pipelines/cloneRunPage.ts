import type {
  ExperimentKFv2,
  PipelineKFv2,
  PipelineRecurringRunKFv2,
  PipelineRunKFv2,
  PipelineVersionKFv2,
} from '~/concepts/pipelines/kfTypes';
import { CreateRunPage } from '~/__tests__/cypress/cypress/pages/pipelines/createRunPage';

class CloneRunPage extends CreateRunPage {
  protected testId = 'clone-run-page';

  constructor(type: 'run' | 'schedule') {
    super(type);
  }

  mockGetRun(namespace: string, run: PipelineRunKFv2) {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
      {
        path: { namespace, serviceName: 'dspa', runId: run.run_id },
      },
      run,
    );
  }

  mockGetRecurringRun(namespace: string, recurringRun: PipelineRecurringRunKFv2) {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId',
      { path: { namespace, serviceName: 'dspa', recurringRunId: recurringRun.recurring_run_id } },
      recurringRun,
    );
  }

  mockGetPipelineVersion(
    namespace: string,
    pipelineVersion: PipelineVersionKFv2,
  ): Cypress.Chainable<null> {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
      {
        path: {
          namespace,
          serviceName: 'dspa',
          pipelineId: pipelineVersion.pipeline_id,
          pipelineVersionId: pipelineVersion.pipeline_version_id,
        },
      },
      pipelineVersion,
    );
  }

  mockGetPipeline(namespace: string, pipeline: PipelineKFv2): Cypress.Chainable<null> {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
      { path: { namespace, serviceName: 'dspa', pipelineId: pipeline.pipeline_id } },
      pipeline,
    );
  }

  mockGetExperiment(namespace: string, experiment: ExperimentKFv2): Cypress.Chainable<null> {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments/:experimentId',
      { path: { namespace, serviceName: 'dspa', experimentId: experiment.experiment_id } },
      experiment,
    );
  }
}

export const cloneRunPage = new CloneRunPage('run');
export const cloneSchedulePage = new CloneRunPage('schedule');
