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
import {
  archiveExperimentModal,
  bulkArchiveExperimentModal,
  bulkRestoreExperimentModal,
  pipelineRunsGlobal,
  restoreExperimentModal,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import { experimentsTabs } from '~/__tests__/cypress/cypress/pages/pipelines/experiments';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url.cy';

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
  describe('Active experiments', () => {
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
      experimentsTabs
        .getActiveExperimentsTable()
        .getRowByName('Test experiment 2')
        .find()
        .should('exist');
    });

    it('archive a single experiment', () => {
      const [experimentToArchive] = mockExperiments;

      const activeExperimentsTable = experimentsTabs.getActiveExperimentsTable();

      activeExperimentsTable.mockArchiveExperiment(experimentToArchive.experiment_id);
      activeExperimentsTable
        .getRowByName(experimentToArchive.display_name)
        .findKebabAction('Archive')
        .click();

      experimentsTabs.mockGetExperiments(
        [mockExperiments[1], mockExperiments[2]],
        [experimentToArchive],
      );
      archiveExperimentModal.findConfirmInput().type(experimentToArchive.display_name);
      archiveExperimentModal.findSubmitButton().click();
      activeExperimentsTable.shouldRowNotBeVisible(experimentToArchive.display_name);

      experimentsTabs.findArchivedTab().click();
      experimentsTabs
        .getArchivedExperimentsTable()
        .getRowByName(experimentToArchive.display_name)
        .find()
        .should('exist');
    });

    it('archive multiple experiments', () => {
      const activeExperimentsTable = experimentsTabs.getActiveExperimentsTable();
      mockExperiments.forEach((activeExperiment) => {
        activeExperimentsTable.mockArchiveExperiment(activeExperiment.experiment_id);
        activeExperimentsTable.getRowByName(activeExperiment.display_name).findCheckbox().click();
      });

      activeExperimentsTable.findActionsKebab().findDropdownItem('Archive').click();
      experimentsTabs.mockGetExperiments([], mockExperiments);
      bulkArchiveExperimentModal.findConfirmInput().type('Archive 3 experiments');
      bulkArchiveExperimentModal.findSubmitButton().click();
      activeExperimentsTable.findEmptyState().should('exist');

      experimentsTabs.findArchivedTab().click();
      mockExperiments.forEach((experiment) =>
        experimentsTabs
          .getArchivedExperimentsTable()
          .getRowByName(experiment.display_name)
          .find()
          .should('exist'),
      );
    });
  });

  describe('Archived experiments', () => {
    beforeEach(() => {
      initIntercepts();
      experimentsTabs.mockGetExperiments([], mockExperiments);
      experimentsTabs.visit(projectName);
      experimentsTabs.findArchivedTab().click();
    });
    it('restore a single experiment', () => {
      const [experimentToRestore] = mockExperiments;

      const archivedExperimentsTable = experimentsTabs.getArchivedExperimentsTable();

      archivedExperimentsTable.mockRestoreExperiment(experimentToRestore.experiment_id);
      archivedExperimentsTable
        .getRowByName(experimentToRestore.display_name)
        .findKebabAction('Restore')
        .click();

      experimentsTabs.mockGetExperiments(
        [experimentToRestore],
        [mockExperiments[1], mockExperiments[2]],
      );
      restoreExperimentModal.findSubmitButton().click();
      archivedExperimentsTable.shouldRowNotBeVisible(experimentToRestore.display_name);

      experimentsTabs.findActiveTab().click();
      experimentsTabs
        .getActiveExperimentsTable()
        .getRowByName(experimentToRestore.display_name)
        .find()
        .should('exist');
    });

    it('restore multiple experiments', () => {
      const archivedExperimentsTable = experimentsTabs.getArchivedExperimentsTable();
      mockExperiments.forEach((archivedExperiment) => {
        archivedExperimentsTable.mockRestoreExperiment(archivedExperiment.experiment_id);
        archivedExperimentsTable
          .getRowByName(archivedExperiment.display_name)
          .findCheckbox()
          .click();
      });
      archivedExperimentsTable.findRestoreExperimentButton().click();
      experimentsTabs.mockGetExperiments(mockExperiments, []);
      bulkRestoreExperimentModal.findSubmitButton().click();
      archivedExperimentsTable.findEmptyState().should('exist');

      experimentsTabs.findActiveTab().click();
      mockExperiments.forEach((experiment) =>
        experimentsTabs
          .getActiveExperimentsTable()
          .getRowByName(experiment.display_name)
          .find()
          .should('exist'),
      );
    });
  });

  describe('Runs page', () => {
    const activeExperimentsTable = experimentsTabs.getActiveExperimentsTable();
    const [mockExperiment] = mockExperiments;

    beforeEach(() => {
      initIntercepts();
      experimentsTabs.mockGetExperiments(mockExperiments);
      experimentsTabs.visit(projectName);
      activeExperimentsTable.getRowByName(mockExperiment.display_name).find().find('a').click();
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
