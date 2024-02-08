/* eslint-disable camelcase */
import startCase from 'lodash-es/startCase';
import { RuntimeStateKF, runtimeStateLabels } from '~/concepts/pipelines/kfTypes';
import {
  mockDashboardConfig,
  mockDataSciencePipelineApplicationK8sResource,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockRouteK8sResource,
  mockStatus,
  buildMockRunKF,
  buildMockExperimentKF,
  buildMockPipelineVersionsV2,
  buildMockPipelineVersionV2,
  buildMockPipelines,
  buildMockPipelineV2,
} from '~/__mocks__';
import {
  pipelineRunTable,
  pipelineRunsGlobal,
  pipelineRunFilterBar,
} from '~/__tests__/cypress/cypress/pages/pipelines';

const projectName = 'test-project-filters';
const pipelineId = 'test-pipeline';
const mockRuns = [
  buildMockRunKF({
    display_name: 'Test triggered run 1',
    run_id: 'run-1',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-1',
    },
    experiment_id: 'test-experiment-1',
    created_at: '2024-02-01T00:00:00Z',
    state: RuntimeStateKF.RUNNING,
  }),
  buildMockRunKF({
    display_name: 'Test triggered run 2',
    run_id: 'run-2',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-2',
    },
    experiment_id: 'test-experiment-2',
    created_at: '2024-02-05T00:00:00Z',
    state: RuntimeStateKF.SUCCEEDED,
  }),
  buildMockRunKF({
    display_name: 'Test triggered run 3',
    run_id: 'run-3',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-2',
    },
    experiment_id: 'test-experiment-1',
    created_at: '2024-02-10T00:00:00Z',
    state: RuntimeStateKF.CANCELED,
  }),
];
const mockExperimentIds = [...new Set(mockRuns.map((mockRun) => mockRun.experiment_id))];
const mockVersionIds = [
  ...new Set(mockRuns.map((mockRun) => mockRun.pipeline_version_reference.pipeline_version_id)),
];
const mockExperiments = mockExperimentIds.map((experimentId) =>
  buildMockExperimentKF({
    experiment_id: experimentId,
    display_name: startCase(experimentId),
  }),
);

const mockVersions = mockVersionIds.map((versionId) =>
  buildMockPipelineVersionV2({
    pipeline_id: pipelineId,
    pipeline_version_id: versionId,
    display_name: startCase(versionId),
  }),
);

describe('Pipeline runs', () => {
  beforeEach(() => {
    initIntercepts();
  });

  describe('Triggered runs', () => {
    beforeEach(() => {
      pipelineRunsGlobal.visit(projectName, 'triggered');
    });

    it('renders the page with table data', () => {
      pipelineRunTable.findRowByName('Test triggered run 1');
    });

    describe('Table filter', () => {
      it('filter by run name', () => {
        // Verify initial run rows exist
        pipelineRunTable.findRows().should('have.length', 3);

        // Select the "Name" filter, enter a value to filter by
        pipelineRunsGlobal.selectFilterByName('Name');
        pipelineRunFilterBar.findNameInput().type('run 1');

        // Mock runs (filtered by typed run name)
        pipelineRunTable.mockGetRuns(
          mockRuns.filter((mockRun) => mockRun.display_name.includes('run 1')),
          1,
        );

        // Verify only rows with the typed run name exist
        pipelineRunTable.findRows().should('have.length', 1);
        pipelineRunTable.findRowByName('Test triggered run 1');
      });

      it('filter by experiment', () => {
        // Mock initial list of experiments
        pipelineRunFilterBar.mockExperiments(mockExperiments);

        // Verify initial run rows exist
        pipelineRunTable.findRows().should('have.length', 3);

        // Select the "Experiment" filter, enter a value to filter by
        pipelineRunsGlobal.selectFilterByName('Experiment');
        pipelineRunFilterBar.findExperimentInput().type('Experiment 1');

        // Mock experiments (filtered by typed value)
        const filteredExperiments = mockExperiments.filter((mockExperiment) =>
          mockExperiment.display_name.includes('Experiment 1'),
        );
        pipelineRunFilterBar.mockExperiments(filteredExperiments);

        // Mock runs (filtered by selected experiment)
        pipelineRunTable.mockGetRuns(
          mockRuns.filter((mockRun) => mockRun.experiment_id === 'test-experiment-1'),
          1,
        );

        // Select an experiment to filter by
        pipelineRunFilterBar.selectExperimentByName('Test Experiment 1');

        // Verify only rows with selected experiment exist
        pipelineRunTable.findRows().should('have.length', 2);
        pipelineRunTable.findRowByName('Test triggered run 1');
        pipelineRunTable.findRowByName('Test triggered run 3');
      });

      it('filter by pipeline version', () => {
        // Verify initial run rows exist
        pipelineRunTable.findRows().should('have.length', 3);

        // Select the "Pipeline version" filter, select a value to filter by
        pipelineRunsGlobal.selectFilterByName('Pipeline version');

        // Mock runs (filtered by selected version)
        pipelineRunTable.mockGetRuns(
          mockRuns.filter(
            (mockRun) =>
              mockRun.pipeline_version_reference.pipeline_version_id === 'test-version-1',
          ),
          1,
        );

        // Select version to filter by
        pipelineRunFilterBar.selectPipelineVersionByName('Test Version 1');

        // Verify only rows with selected experiment exist
        pipelineRunTable.findRows().should('have.length', 1);
        pipelineRunTable.findRowByName('Test triggered run 1');
      });

      it('filter by started', () => {
        // Verify initial run rows exist
        pipelineRunTable.findRows().should('have.length', 3);

        // Select the "Started" filter, select a value to filter by
        pipelineRunsGlobal.selectFilterByName('Started');

        // Mock runs (filtered by start date), type a start date
        pipelineRunTable.mockGetRuns(
          mockRuns.filter((mockRun) => mockRun.created_at.includes('2024-02-10')),
          1,
        );
        pipelineRunFilterBar.findStartDateInput().type('2024-02-10');

        // Verify only rows with selected start date exist
        pipelineRunTable.findRows().should('have.length', 1);
        pipelineRunTable.findRowByName('Test triggered run 3');

        // Mock runs with a cleared filter before updating again
        pipelineRunTable.mockGetRuns(mockRuns, 1);
        pipelineRunFilterBar.findStartDateInput().clear();

        // Mock runs with a start date not associated with those runs
        pipelineRunTable.mockGetRuns(
          mockRuns.filter((mockRun) => mockRun.created_at.includes('2024-02-15')),
          1,
        );
        pipelineRunFilterBar.findStartDateInput().type('2024-02-15');

        // Verify no results were found
        pipelineRunTable.findEmptyResults().should('exist');
      });

      it('filter by status', () => {
        // Verify initial run rows exist
        pipelineRunTable.findRows().should('have.length', 3);

        // Select the "Status" filter
        pipelineRunsGlobal.selectFilterByName('Status');

        // Mock runs (filtered by a status of 'RUNNING')
        pipelineRunTable.mockGetRuns(
          mockRuns.filter((mockRun) => mockRun.state === RuntimeStateKF.RUNNING),
          1,
        );
        // Select a filter value of 'RUNNING'
        pipelineRunFilterBar.selectStatusByName(runtimeStateLabels[RuntimeStateKF.RUNNING]);

        // Verify only rows with the selected status exist
        pipelineRunTable.findRows().should('have.length', 1);
        pipelineRunTable.findRowByName('Test triggered run 1');

        // Mock runs (filtered by a status of 'SUCCEEDED')
        pipelineRunTable.mockGetRuns(
          mockRuns.filter((mockRun) => mockRun.state === RuntimeStateKF.SUCCEEDED),
          1,
        );
        // Select a filter value of 'SUCCEEDED'
        pipelineRunFilterBar.selectStatusByName(runtimeStateLabels[RuntimeStateKF.SUCCEEDED]);

        // Verify only rows with the selected status exist
        pipelineRunTable.findRows().should('have.length', 1);
        pipelineRunTable.findRowByName('Test triggered run 2');

        // Mock runs (filtered by a status of 'CANCELED')
        pipelineRunTable.mockGetRuns(
          mockRuns.filter((mockRun) => mockRun.state === RuntimeStateKF.CANCELED),
          1,
        );
        // Select a filter value of 'CANCELED'
        pipelineRunFilterBar.selectStatusByName(runtimeStateLabels[RuntimeStateKF.CANCELED]);

        // Verify only rows with the selected status exist
        pipelineRunTable.findRows().should('have.length', 1);
        pipelineRunTable.findRowByName('Test triggered run 3');
      });
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
      pathname: '/api/proxy/apis/v2beta1/runs',
      times: 2,
    },
    {
      runs: mockRuns,
    },
  );

  cy.intercept(
    {
      method: 'POST',
      pathname: `/api/proxy/apis/v2beta1/pipelines`,
    },
    buildMockPipelines([buildMockPipelineV2({ pipeline_id: pipelineId })]),
  );

  cy.intercept(
    {
      method: 'POST',
      pathname: `/api/proxy/apis/v2beta1/pipelines/${pipelineId}/versions`,
    },
    buildMockPipelineVersionsV2(mockVersions),
  );

  mockExperiments.forEach((experiment) => {
    cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/experiments/${experiment.experiment_id}`,
      },
      experiment,
    );
  });
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
