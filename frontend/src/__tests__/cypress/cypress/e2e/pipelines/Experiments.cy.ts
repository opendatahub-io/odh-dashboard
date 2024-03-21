/* eslint-disable camelcase */
import {
  buildMockExperimentKF,
  mockDashboardConfig,
  mockDataSciencePipelineApplicationK8sResource,
  mockK8sResourceList,
  buildMockPipelineV2,
  buildMockPipelines,
  buildMockPipelineVersionV2,
  buildMockPipelineVersionsV2,
  mockProjectK8sResource,
  mockRouteK8sResource,
  mockStatus,
} from '~/__mocks__';
import { experimentsTabs } from '~/__tests__/cypress/cypress/pages/pipelines/experiments';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url.cy';
import { pipelineRunsGlobal } from '~/__tests__/cypress/cypress/pages/pipelines';

const projectName = 'test-project-name';
const initialMockPipeline = buildMockPipelineV2({ display_name: 'Test pipeline' });
const initialMockPipelineVersion = buildMockPipelineVersionV2({
  pipeline_id: initialMockPipeline.pipeline_id,
});
const mockExperiments = [
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

describe('Experiments', () => {
  beforeEach(() => {
    initIntercepts();
    experimentsTabs.mockGetExperiments(mockExperiments);
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

    // Select the "Experiment" filter, enter a value to filter by
    experimentsTabs.getActiveExperimentsTable().selectFilterByName('Experiment');
    experimentsTabs.getActiveExperimentsTable().findFilterTextField().type('Test experiment 2');

    // Mock experiments (filtered by typed experiment name)
    experimentsTabs.mockGetExperiments(
      mockExperiments.filter((exp) => exp.display_name.includes('Test experiment 2')),
    );

    // Verify only rows with the typed experiment name exist
    experimentsTabs.getActiveExperimentsTable().findRows().should('have.length', 1);
    experimentsTabs.getActiveExperimentsTable().findRowByName('Test experiment 2');
  });

  describe('Runs page', () => {
    const activeExperimentsTable = experimentsTabs.getActiveExperimentsTable();
    const [mockExperiment] = mockExperiments;

    beforeEach(() => {
      activeExperimentsTable.findRowByName(mockExperiment.display_name).find('a').click();
    });

    it('navigates to the runs page when clicking an experiment name', () => {
      verifyRelativeURL(`/experiments/${projectName}/${mockExperiment.experiment_id}/runs`);
      cy.findByLabelText('Breadcrumb').findByText('Experiments');
    });

    it('has "Experiment" value pre-filled when on the "Create run" page', () => {
      pipelineRunsGlobal.findCreateRunButton().click();
      cy.findByLabelText('Experiment').contains(mockExperiment.display_name);
    });

    it('navigates back to experiments from "Create run" page breadcrumb', () => {
      pipelineRunsGlobal.findCreateRunButton().click();
      cy.findByLabelText('Breadcrumb').findByText(`Experiments - ${projectName}`).click();
      verifyRelativeURL(`/experiments/${projectName}`);
    });

    it('navigates back to experiment runs page from "Create run" page breadcrumb', () => {
      pipelineRunsGlobal.findCreateRunButton().click();
      cy.findByLabelText('Breadcrumb').findByText(mockExperiment.display_name).click();
      verifyRelativeURL(`/experiments/${projectName}/${mockExperiment.experiment_id}/runs`);
    });

    it('has "Experiment" value pre-filled when on the "Schedule run" page', () => {
      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunsGlobal.findScheduleRunButton().click();
      cy.findByLabelText('Experiment').contains(mockExperiment.display_name);
    });
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
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: projectName, displayName: projectName }),
    ]),
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
    { runs: [] },
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v2beta1/recurringruns',
    },
    {
      recurringRuns: [],
    },
  );
  cy.intercept(
    {
      pathname: `/api/proxy/apis/v2beta1/experiments/${mockExperiments[0].experiment_id}`,
    },
    mockExperiments[0],
  );
};
