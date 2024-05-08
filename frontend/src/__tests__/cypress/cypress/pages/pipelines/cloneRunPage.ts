import {
  PipelineKF,
  PipelineRunJobKF,
  PipelineVersionKF,
  PipelineRunResourceKF,
} from '~/concepts/pipelines/kfTypes';
import { CreateRunPage } from '~/__tests__/cypress/cypress/pages/pipelines/createRunPage';

class CloneRunPage extends CreateRunPage {
  protected testId = 'clone-run-page';

  constructor() {
    super();
  }

  mockGetRunResource(runResource: PipelineRunResourceKF, namespace: string) {
    return cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${namespace}/pipelines-definition/apis/v1beta1/runs/${runResource.run.id}`,
      },
      runResource,
    );
  }

  mockGetJob(job: PipelineRunJobKF, namespace: string) {
    return cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${namespace}/pipelines-definition/apis/v1beta1/jobs/${job.id}`,
      },
      job,
    );
  }

  mockGetPipelineVersion(
    pipelineVersion: PipelineVersionKF,
    namespace: string,
  ): Cypress.Chainable<null> {
    return cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${namespace}/pipelines-definition/apis/v1beta1/pipeline_versions/${pipelineVersion.id}`,
      },
      pipelineVersion,
    );
  }

  mockGetPipeline(pipeline: PipelineKF, namespace: string): Cypress.Chainable<null> {
    return cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${namespace}/pipelines-definition/apis/v1beta1/pipelines/${pipeline.id}`,
      },
      pipeline,
    );
  }
}

export const cloneRunPage = new CloneRunPage();
