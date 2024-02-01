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

  mockGetRunResource(runResource: PipelineRunResourceKF) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v1beta1/runs/${runResource.run.id}`,
      },
      runResource,
    );
  }

  mockGetJob(job: PipelineRunJobKF) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v1beta1/jobs/${job.id}`,
      },
      job,
    );
  }

  mockGetPipelineVersion(pipelineVersion: PipelineVersionKF): Cypress.Chainable<null> {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v1beta1/pipeline_versions/${pipelineVersion.id}`,
      },
      pipelineVersion,
    );
  }

  mockGetPipeline(pipeline: PipelineKF): Cypress.Chainable<null> {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v1beta1/pipelines/${pipeline.id}`,
      },
      pipeline,
    );
  }
}

export const cloneRunPage = new CloneRunPage();
