/* eslint-disable camelcase */
import startCase from 'lodash-es/startCase';
import { PipelineRunJobKFv2, PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import {
  mockStatus,
  mockDashboardConfig,
  mockDataSciencePipelineApplicationK8sResource,
  mockRouteK8sResource,
  mockK8sResourceList,
  buildMockRunKF,
  buildMockPipelineV2,
  buildMockPipelineVersionV2,
  mockProjectK8sResource,
  buildMockExperimentKF,
  buildMockJobKF,
} from '~/__mocks__';
import {
  createRunPage,
  cloneRunPage,
  pipelineRunJobTable,
  pipelineRunsGlobal,
  pipelineRunTable,
} from '~/__tests__/cypress/cypress/pages/pipelines';

const projectName = 'test-project-name';
const mockPipeline = buildMockPipelineV2();
const mockPipelineVersion = buildMockPipelineVersionV2({ pipeline_id: mockPipeline.pipeline_id });
const pipelineVersionRef = {
  pipeline_id: mockPipeline.pipeline_id,
  pipeline_version_id: mockPipelineVersion.pipeline_version_id,
};
const initialMockRuns = [
  buildMockRunKF({
    pipeline_version_reference: pipelineVersionRef,
  }),
];
const initialMockRecurringRuns = [
  buildMockJobKF({
    pipeline_version_reference: pipelineVersionRef,
  }),
];
const buildMockExperiments = (experimentIds: string[]) =>
  experimentIds.map((experimentId) =>
    buildMockExperimentKF({
      experiment_id: experimentId,
      display_name: startCase(experimentId),
    }),
  );

describe('Pipeline create runs', () => {
  beforeEach(() => {
    initIntercepts();
    pipelineRunsGlobal.visit(projectName);
  });

  it('renders the page with scheduled and triggered runs table data', () => {
    pipelineRunJobTable.findRowByName('Test job');
    pipelineRunsGlobal.findTriggeredTab().click();
    pipelineRunTable.findRowByName('Test run');
  });

  describe('Triggered runs', () => {
    beforeEach(() => {
      const mockExperimentIds = [
        ...new Set(initialMockRuns.map((mockRun) => mockRun.experiment_id)),
      ];

      buildMockExperiments(mockExperimentIds).forEach((experiment) => {
        cy.intercept(
          {
            method: 'POST',
            pathname: `/api/proxy/apis/v2beta1/experiments/${experiment.experiment_id}`,
          },
          experiment,
        );
      });
    });

    it('creates a triggered run', () => {
      const createRunParams: Partial<PipelineRunKFv2> = {
        display_name: 'New run',
        description: 'New run description',
        run_id: 'new-run-id',
        runtime_config: {
          parameters: {
            min_max_scaler: true,
            neighbors: 5,
            standard_scaler: 'no',
          },
        },
      };

      // Mock pipelines & versions for form select dropdowns
      createRunPage.mockGetPipelines([mockPipeline]).as('getPipelines');
      createRunPage
        .mockGetPipelineVersions([mockPipelineVersion], mockPipelineVersion.pipeline_id)
        .as('getPipelinesVersions');

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findCreateRunButton().click();
      cy.url().should('include', '/pipelineRun/create');
      createRunPage.find();

      // Fill out the form without a schedule and submit
      createRunPage.fillName('New run');
      createRunPage.fillDescription('New run description');
      createRunPage.findPipelineSelect().should('not.be.disabled');
      createRunPage.selectPipelineByName('Test pipeline');
      createRunPage.findPipelineVersionSelect().should('not.be.disabled');
      createRunPage.findTriggeredRunTypeRadioInput().click();
      createRunPage.fillParamInputByLabel('min_max_scaler', 'true');
      createRunPage.fillParamInputByLabel('neighbors', '5');
      createRunPage.fillParamInputByLabel('standard_scaler', 'no');
      createRunPage.mockCreateRun(mockPipelineVersion, createRunParams).as('createRun');
      createRunPage.submit();

      // Should be redirected to the run details page
      cy.url().should('include', '/pipelineRun/view/new-run-id');
    });

    it('duplicates a triggered run', () => {
      const [mockRun] = initialMockRuns;
      const mockDuplicateRun = buildMockRunKF({
        display_name: 'Duplicate of Test run',
        run_id: 'duplicate-run-id',
      });

      // Mock pipelines & versions for form select dropdowns
      cloneRunPage.mockGetPipelines([mockPipeline]).as('getPipelines');
      cloneRunPage
        .mockGetPipelineVersions([mockPipelineVersion], mockPipelineVersion.pipeline_id)
        .as('getPipelinesVersions');
      cloneRunPage.mockGetRun(mockRun);
      cloneRunPage.mockGetPipelineVersion(mockPipelineVersion);
      cloneRunPage.mockGetPipeline(mockPipeline);

      // Mock runs list with newly cloned run
      pipelineRunTable.mockGetRuns([...initialMockRuns, mockDuplicateRun]).as('refreshRuns');

      // Navigate to clone run page for a given triggered run
      pipelineRunsGlobal.findTriggeredTab().click();
      pipelineRunTable.selectRowActionByName(mockRun.display_name, 'Duplicate');
      cy.url().should('include', `/pipelineRun/clone/${mockRun.run_id}`);

      // Verify pre-populated values & submit
      cloneRunPage.findPipelineSelect().should('have.text', mockPipeline.display_name);
      cloneRunPage
        .findPipelineVersionSelect()
        .should('have.text', mockPipelineVersion.display_name);
      Object.entries(mockDuplicateRun.runtime_config?.parameters || {}).map(
        ([paramLabel, paramValue]) =>
          cloneRunPage.findParamByLabel(paramLabel).should('have.value', paramValue.toString()),
      );

      cloneRunPage.mockCreateRun(mockPipelineVersion, mockDuplicateRun).as('cloneRun');
      cloneRunPage.submit();

      // Should redirect to the details of the newly cloned triggered run
      cy.url().should('include', `/pipelineRun/view/${mockDuplicateRun.run_id}`);
    });
  });

  describe('Scheduled runs', () => {
    beforeEach(() => {
      const mockExperimentIds = [
        ...new Set(initialMockRecurringRuns.map((mockRun) => mockRun.experiment_id)),
      ];

      buildMockExperiments(mockExperimentIds).forEach((experiment) => {
        cy.intercept(
          {
            method: 'POST',
            pathname: `/api/proxy/apis/v2beta1/experiments/${experiment.experiment_id}`,
          },
          experiment,
        );
      });
    });

    it('creates a scheduled run', () => {
      const createRecurringRunParams: Partial<PipelineRunJobKFv2> = {
        display_name: 'New job',
        description: 'New job description',
        recurring_run_id: 'new-job-id',
        runtime_config: {
          parameters: {
            min_max_scaler: false,
            neighbors: 0,
            standard_scaler: 'sure',
          },
        },
      };

      // Mock pipelines & versions for form select dropdowns
      createRunPage.mockGetPipelines([mockPipeline]).as('getPipelines');
      createRunPage
        .mockGetPipelineVersions([mockPipelineVersion], mockPipelineVersion.pipeline_id)
        .as('getPipelinesVersions');

      // Mock jobs list with newly created job
      pipelineRunJobTable
        .mockGetJobs([...initialMockRecurringRuns, buildMockJobKF(createRecurringRunParams)])
        .as('refreshRecurringRuns');

      // Navigate to the 'Create run' page
      pipelineRunsGlobal.findCreateRunButton().click();
      cy.url().should('include', '/pipelineRun/create');
      createRunPage.find();

      // Fill out the form with a schedule and submit
      createRunPage.fillName('New job');
      createRunPage.fillDescription('New job description');
      createRunPage.findPipelineSelect().should('not.be.disabled');
      createRunPage.selectPipelineByName('Test pipeline');
      createRunPage.findPipelineVersionSelect().should('not.be.disabled');
      createRunPage.findScheduledRunTypeRadioInput().click();
      createRunPage.fillParamInputByLabel('standard_scaler', 'sure');
      createRunPage
        .mockCreateRecurringRun(mockPipelineVersion, createRecurringRunParams)
        .as('createRecurringRun');
      createRunPage.submit();

      // Should show newly created scheduled run in the table
      cy.wait('@refreshRecurringRuns');
      pipelineRunJobTable.findRowByName('New job');
    });

    it('duplicates a scheduled run', () => {
      const [mockRecurringRun] = initialMockRecurringRuns;
      const mockDuplicateRecurringRun = buildMockJobKF({
        display_name: 'Duplicate of Test job',
        recurring_run_id: 'duplicate-job-id',
      });

      // Mock pipelines & versions for form select dropdowns
      cloneRunPage.mockGetPipelines([mockPipeline]).as('getPipelines');
      cloneRunPage
        .mockGetPipelineVersions([mockPipelineVersion], mockPipelineVersion.pipeline_id)
        .as('getPipelinesVersions');
      cloneRunPage.mockGetRecurringRun(mockRecurringRun);
      cloneRunPage.mockGetPipelineVersion(mockPipelineVersion);
      cloneRunPage.mockGetPipeline(mockPipeline);

      // Mock jobs list with newly cloned job
      pipelineRunJobTable
        .mockGetJobs([...initialMockRecurringRuns, mockDuplicateRecurringRun])
        .as('refreshRecurringRuns');

      // Navigate to clone run page for a given scheduled run
      pipelineRunJobTable.selectRowActionByName(mockRecurringRun.display_name, 'Duplicate');
      cy.url().should('include', `/pipelineRun/cloneJob/${mockRecurringRun.recurring_run_id}`);

      // Verify pre-populated values & submit
      cloneRunPage.findPipelineSelect().should('have.text', mockPipeline.display_name);
      cloneRunPage
        .findPipelineVersionSelect()
        .should('have.text', mockPipelineVersion.display_name);
      Object.entries(mockDuplicateRecurringRun.runtime_config?.parameters || {}).map(
        ([paramLabel, paramValue]) =>
          cloneRunPage.findParamByLabel(paramLabel).should('have.value', paramValue.toString()),
      );
      cloneRunPage
        .mockCreateRecurringRun(mockPipelineVersion, mockDuplicateRecurringRun)
        .as('cloneRecurringRun');
      cloneRunPage.submit();

      // Should show newly cloned scheduled run in the table
      cy.wait('@refreshRecurringRuns');
      pipelineRunJobTable.findRowByName('Duplicate of Test job');
    });
  });
});

const initIntercepts = () => {
  cy.intercept('/api/status', mockStatus());
  cy.intercept('/api/config', mockDashboardConfig({}));
  mockDspaIntercepts();

  cy.intercept(
    {
      pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
    },
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: projectName, displayName: 'Test project filters' }),
    ]),
  );

  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v2beta1/recurringruns',
    },
    { recurringRuns: initialMockRecurringRuns, total_size: initialMockRecurringRuns.length },
  );

  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v2beta1/runs',
    },
    { runs: initialMockRuns, total_size: initialMockRuns.length },
  );
};

const mockDspaIntercepts = () => {
  cy.intercept(
    {
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications/pipelines-definition`,
    },
    mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
  );

  cy.intercept(
    {
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications`,
    },
    mockK8sResourceList([mockDataSciencePipelineApplicationK8sResource({})]),
  );

  cy.intercept(
    {
      method: 'GET',
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications/dspa`,
    },
    mockDataSciencePipelineApplicationK8sResource({}),
  );

  cy.intercept(
    {
      pathname: `/api/k8s/apis/route.openshift.io/v1/namespaces/${projectName}/routes/ds-pipeline-dspa`,
    },
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-pipelines-definition',
      namespace: projectName,
    }),
  );
};
