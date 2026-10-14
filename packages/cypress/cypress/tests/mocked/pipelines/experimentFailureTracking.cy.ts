/* eslint-disable camelcase */
import { buildMockPipeline, buildMockPipelineVersion } from '@odh-dashboard/internal/__mocks__';
import { initIntercepts, mockExperiments, projectName } from './runs/pipelineRunsTestUtils';
import { activeRunsTable, createRunPage, pipelineRunsGlobal } from '../../../pages/pipelines';
import { Modal } from '../../../pages/components/Modal';
import { captureTracking, expectSafeTracking } from '../../../utils/analytics';

class CreateExperimentModal extends Modal {
  constructor() {
    super('Create run group');
  }

  findNameInput() {
    return this.find().findByLabelText(/Run group name/);
  }

  findSubmitButton() {
    return this.findFooter().findByRole('button', { name: 'Create run group' });
  }

  findErrorAlert() {
    return this.find().findByRole('heading', { name: /Error creating run group/ });
  }
}

const createExperimentModal = new CreateExperimentModal();

describe('Pipeline experiment failure tracking', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('keeps a create failure diagnostic out of analytics', () => {
    const message = 'Private experiment creation diagnostic';
    const pipeline = buildMockPipeline({ pipeline_id: 'privacy-pipeline' });
    const version = buildMockPipelineVersion({
      pipeline_id: pipeline.pipeline_id,
      pipeline_version_id: 'privacy-version',
    });
    createRunPage.mockGetExperiments(projectName, mockExperiments);
    createRunPage.mockGetPipelines(projectName, [pipeline]);
    createRunPage.mockGetPipelineVersions(projectName, [version], pipeline.pipeline_id);
    activeRunsTable.mockGetActiveRuns([], projectName);
    cy.intercept('POST', `**/api/service/pipelines/${projectName}/dspa/apis/v2beta1/experiments`, {
      forceNetworkError: true,
    }).as('createExperimentFailure');
    pipelineRunsGlobal.visit(projectName);
    pipelineRunsGlobal.findCreateRunButton().click();
    createRunPage.find();
    createRunPage.findRunGroupToggle().click();
    createRunPage.findCreateRunGroupButton().click();
    createExperimentModal.findNameInput().type('Privacy test run group');
    captureTracking();
    createExperimentModal.findSubmitButton().click();
    cy.wait('@createExperimentFailure');
    createExperimentModal.findErrorAlert().should('be.visible');
    expectSafeTracking('Run Group Created', { success: false, error: 'unknown_error' }, message);
  });
});
