/* eslint-disable camelcase */
import { mockStatus } from '~/__mocks__/mockStatus';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import {
  createRunPage,
  pipelineRunJobTable,
  pipelineRunsGlobal,
  pipelineRunTable,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import { buildMockJobKF } from '~/__mocks__/mockJobKF';
import { buildMockRunKF } from '~/__mocks__/mockRunKF';
import { buildMockPipeline } from '~/__mocks__/mockPipelinesProxy';
import { buildMockPipelineVersion } from '~/__mocks__/mockPipelineVersionsProxy';
import { RelationshipKF, ResourceTypeKF } from '~/concepts/pipelines/kfTypes';

const projectName = 'test-project-name';
const mockPipeline = buildMockPipeline();
const mockPipelineVersion = buildMockPipelineVersion({
  id: mockPipeline.default_version?.id,
  name: mockPipeline.default_version?.name,
  resource_references: [
    {
      key: { type: ResourceTypeKF.PIPELINE, id: mockPipeline.id },
      relationship: RelationshipKF.OWNER,
    },
  ],
});
const initialRuns = [buildMockRunKF()];
const initialJobs = [buildMockJobKF()];

describe('Pipeline Runs Global', () => {
  beforeEach(() => {
    initIntercepts();
    pipelineRunsGlobal.visit(projectName);
  });

  it('renders the page with scheduled and triggered runs table data', () => {
    pipelineRunJobTable.findRowByName('Test job');
    pipelineRunsGlobal.findTriggeredTab().click();
    pipelineRunTable.findRowByName('Test run');
  });

  it('creates a triggered run', () => {
    const createRunParams = {
      name: 'New run',
      description: 'New run description',
      id: 'new-run-id',
    };

    // Mock pipelines & versions for form select dropdowns
    createRunPage.mockPipelines([mockPipeline]).as('getPipelines');
    createRunPage
      .mockPipelineVersions(projectName, mockPipeline.id, [mockPipelineVersion])
      .as('getPipelinesVersions');

    // Navigate to the 'Create run' page
    pipelineRunsGlobal.findCreateRunButton().click();
    createRunPage.find();

    // Fill out the form without a schedule and submit
    createRunPage.fillName('New run');
    createRunPage.fillDescription('New run description');
    createRunPage.findPipelineSelect().should('not.be.disabled');
    createRunPage.selectPipelineByName('Test pipeline');
    createRunPage.findPipelineVersionSelect().should('not.be.disabled');
    createRunPage.findTriggeredRunTypeRadioInput().click();
    createRunPage.mockCreateRun(projectName, mockPipelineVersion, createRunParams).as('createRun');
    createRunPage.submit();

    // Should be redirected to the run details page
    cy.url().should('include', '/pipelineRun/view/new-run-id');
  });

  it('creates a scheduled run', () => {
    const createJobParams = {
      name: 'New job',
      description: 'New job description',
      id: 'new-job-id',
    };

    // Mock pipelines & versions for form select dropdowns
    createRunPage.mockPipelines([mockPipeline]).as('getPipelines');
    createRunPage
      .mockPipelineVersions(projectName, mockPipeline.id, [mockPipelineVersion])
      .as('getPipelinesVersions');

    // Mock jobs list with newly created job
    pipelineRunJobTable
      .mockJobs([...initialJobs, buildMockJobKF(createJobParams)])
      .as('refreshRunJobs');

    // Navigate to the 'Create run' page
    pipelineRunsGlobal.findCreateRunButton().click();
    createRunPage.find();

    // Fill out the form with a schedule and submit
    createRunPage.fillName('New job');
    createRunPage.fillDescription('New job description');
    createRunPage.findPipelineSelect().should('not.be.disabled');
    createRunPage.selectPipelineByName('Test pipeline');
    createRunPage.findPipelineVersionSelect().should('not.be.disabled');
    createRunPage.findScheduledRunTypeRadioInput().click();
    createRunPage.mockCreateJob(projectName, mockPipelineVersion, createJobParams).as('createJob');
    createRunPage.submit();

    // Should show newly created scheduled job in the table
    cy.wait('@refreshRunJobs');
    pipelineRunJobTable.findRowByName('New job');
  });
});

// it('duplicates a run', () => {});

const initIntercepts = () => {
  cy.intercept('/api/status', mockStatus());
  cy.intercept('/api/config', mockDashboardConfig({}));
  cy.intercept(
    {
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications/pipelines-definition`,
    },
    mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
  );
  cy.intercept(
    {
      pathname: `/api/k8s/apis/route.openshift.io/v1/namespaces/${projectName}/routes/ds-pipeline-pipelines-definition`,
    },
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-pipelines-definition',
      namespace: projectName,
    }),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
    },
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: projectName }),
      mockProjectK8sResource({ k8sName: `${projectName}-2`, displayName: 'Test Project 2' }),
    ]),
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v1beta1/jobs',
    },
    { jobs: initialJobs },
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v1beta1/runs',
    },
    { runs: initialRuns },
  );
};
