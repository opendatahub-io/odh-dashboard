import {
  PipelineKFv2,
  PipelineRunJobKFv2,
  PipelineRunKFv2,
  PipelineVersionKFv2,
} from '~/concepts/pipelines/kfTypes';
import { CreateRunPage } from '~/__tests__/cypress/cypress/pages/pipelines/createRunPage';

class CloneRunPage extends CreateRunPage {
  protected testId = 'clone-run-page';

  constructor() {
    super();
  }

  mockGetRun(run: PipelineRunKFv2) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/runs/${run.run_id}`,
      },
      run,
    );
  }

  mockGetRecurringRun(recurringRun: PipelineRunJobKFv2) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/recurringruns/${recurringRun.recurring_run_id}`,
      },
      recurringRun,
    );
  }

  mockGetPipelineVersion(pipelineVersion: PipelineVersionKFv2): Cypress.Chainable<null> {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/pipelines/${pipelineVersion.pipeline_id}/versions/${pipelineVersion.pipeline_version_id}`,
      },
      pipelineVersion,
    );
  }

  mockGetPipeline(pipeline: PipelineKFv2): Cypress.Chainable<null> {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/pipelines/${pipeline.pipeline_id}`,
      },
      pipeline,
    );
  }
}

export const cloneRunPage = new CloneRunPage();
