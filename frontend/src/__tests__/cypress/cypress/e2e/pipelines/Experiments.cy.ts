/* eslint-disable camelcase */
import { buildMockExperimentKF, buildMockRunKF } from '~/__mocks__';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { buildMockPipelineV2, buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import {
  buildMockPipelineVersionV2,
  buildMockPipelineVersionsV2,
} from '~/__mocks__/mockPipelineVersionsProxy';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import { experimentsTabs } from '~/__tests__/cypress/cypress/pages/pipelines/experiments';
import { RuntimeStateKF } from '~/concepts/pipelines/kfTypes';

const projectName = 'test-project-name';
const initialMockPipeline = buildMockPipelineV2({ display_name: 'Test pipeline' });
const initialMockPipelineVersion = buildMockPipelineVersionV2({
  pipeline_id: initialMockPipeline.pipeline_id,
});
const mockExperimentArray = [
  buildMockExperimentKF({
    display_name: 'Test experiment 1',
    experiment_id: '1',
  }),
  buildMockExperimentKF({
    display_name: 'Test experiment 2',
    experiment_id: '2',
  }),
  buildMockExperimentKF({
    display_name: 'Test experiment 3',
    experiment_id: '3',
  }),
];

const runs = Array.from({ length: 5 }, (_, i) =>
  buildMockRunKF({
    display_name: 'Test triggered run 1',
    run_id: `run-${i}`,
    pipeline_version_reference: {
      pipeline_id: initialMockPipeline.pipeline_id,
      pipeline_version_id: initialMockPipelineVersion.pipeline_version_id,
    },
    experiment_id: '1',
    created_at: '2024-02-01T00:00:00Z',
    state: RuntimeStateKF.SUCCEEDED,
  }),
);

describe('Pipeline Experiments', () => {
  beforeEach(() => {
    initIntercepts();
    experimentsTabs.mockGetExperiments(mockExperimentArray);
    experimentsTabs.visit(projectName);
  });

  it('shows empty states', () => {
    experimentsTabs.mockGetExperiments([]);
    experimentsTabs.visit(projectName);
    experimentsTabs.findActiveTab().click();
    experimentsTabs.getActiveExperimentsTable().findEmptyState().should('exist');
    experimentsTabs.findArchivedTab().click();
    experimentsTabs.getArchivedExperimentsTable().findEmptyState().should('exist');
  });

  it('filters by experiment name', () => {
    experimentsTabs.findActiveTab().click();
    // Verify initial run rows exist
    experimentsTabs.getActiveExperimentsTable().findRows().should('have.length', 3);

    // Select the "Name" filter, enter a value to filter by
    experimentsTabs.getActiveExperimentsTable().selectFilterByName('Experiment');
    experimentsTabs.getActiveExperimentsTable().findFilterTextField().type('Test experiment 2');

    // Mock runs (filtered by typed run name)
    experimentsTabs.mockGetExperiments(
      mockExperimentArray.filter((exp) => exp.display_name.includes('Test experiment 2')),
    );

    // Verify only rows with the typed run name exist
    experimentsTabs.getActiveExperimentsTable().findRows().should('have.length', 1);
    experimentsTabs.getActiveExperimentsTable().findRowByName('Test experiment 2');
  });
});

const initIntercepts = () => {
  cy.intercept('/api/status', mockStatus());
  cy.intercept('/api/config', mockDashboardConfig({ disablePipelineExperiments: false }));
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
      notebookName: 'ds-pipeline-dspa',
      namespace: projectName,
    }),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
    },
    mockK8sResourceList([mockProjectK8sResource({ k8sName: projectName })]),
  );

  cy.intercept(
    {
      pathname: '/api/proxy/apis/v2beta1/pipelines',
    },
    buildMockPipelines([initialMockPipeline]),
  );

  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v2beta1/pipeline_versions',
    },
    buildMockPipelineVersionsV2([initialMockPipelineVersion]),
  );
  cy.intercept(
    {
      pathname: '/api/proxy/apis/v2beta1/runs',
    },
    { runs },
  );
};
