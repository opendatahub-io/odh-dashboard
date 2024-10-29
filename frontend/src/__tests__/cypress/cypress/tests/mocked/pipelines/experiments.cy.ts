/* eslint-disable camelcase */
import {
  buildMockExperimentKF,
  mockDashboardConfig,
  mockDataSciencePipelineApplicationK8sResource,
  mockK8sResourceList,
  buildMockPipeline,
  buildMockPipelines,
  mockProjectK8sResource,
  mockRouteK8sResource,
  buildMockRunKF,
  buildMockRecurringRunKF,
} from '~/__mocks__';
import {
  activeRunsTable,
  archivedRunsTable,
  archiveExperimentModal,
  bulkArchiveExperimentModal,
  bulkRestoreExperimentModal,
  pipelineRunDetails,
  pipelineRecurringRunTable,
  pipelineRunsGlobal,
  restoreExperimentModal,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import { experimentsTabs } from '~/__tests__/cypress/cypress/pages/pipelines/experiments';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import {
  DataSciencePipelineApplicationModel,
  ProjectModel,
  RouteModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { RecurringRunStatus, RuntimeStateKF, StorageStateKF } from '~/concepts/pipelines/kfTypes';

const projectName = 'test-project-name';
const initialMockPipeline = buildMockPipeline({ display_name: 'Test pipeline' });
const currentTime = new Date();
currentTime.setMonth(currentTime.getMonth() - 3);
const mockExperiments = [
  buildMockExperimentKF({
    display_name: 'Test experiment 1',
    experiment_id: '1',
    description: 'Test experiment 1',
    last_run_created_at: currentTime.toISOString(),
  }),
  buildMockExperimentKF({
    display_name: 'Test experiment 2',
    experiment_id: '2',
    last_run_created_at: '1970-01-01T00:00:00Z',
  }),
  buildMockExperimentKF({
    display_name: 'Test experiment 3',
    experiment_id: '3',
    last_run_created_at: '',
  }),
];

const mockArchivedExperiments = mockExperiments.map((experiment) => ({
  ...experiment,
  storage_state: StorageStateKF.ARCHIVED,
}));

const mockActiveRuns = buildMockRunKF({
  display_name: 'Test active run 4',
  run_id: 'run-4',
  experiment_id: 'test-experiment-1',
  created_at: '2024-02-10T00:00:00Z',
  state: RuntimeStateKF.SUCCEEDED,
});

describe('Experiments', () => {
  describe('Active experiments', () => {
    beforeEach(() => {
      initIntercepts();
      experimentsTabs.mockGetExperiments(projectName, mockExperiments);
      experimentsTabs.visit(projectName);
    });

    it('shows empty states', () => {
      experimentsTabs.mockGetExperiments(projectName, []);
      experimentsTabs.visit(projectName);
      experimentsTabs.findActiveTab().click();
      experimentsTabs.getActiveExperimentsTable().findEmptyState().should('exist');
      experimentsTabs.findArchivedTab().click();
      experimentsTabs.getArchivedExperimentsTable().findEmptyState().should('exist');
    });

    it('experiments table time', () => {
      experimentsTabs.findActiveTab().click();
      const activeExperimentsTable = experimentsTabs.getActiveExperimentsTable();
      activeExperimentsTable
        .getRowByName('Test experiment 1')
        .findDescription()
        .should('have.text', 'Test experiment 1');
      activeExperimentsTable
        .getRowByName('Test experiment 1')
        .findExperimentLastRunTime()
        .contains('3 months ago');

      // Last run time when experiment is just created
      activeExperimentsTable
        .getRowByName('Test experiment 2')
        .findExperimentLastRunTime()
        .contains('-');

      // Last run time when empty
      activeExperimentsTable
        .getRowByName('Test experiment 3')
        .findExperimentLastRunTime()
        .contains('-');
    });

    it('filters by experiment name', () => {
      experimentsTabs.findActiveTab().click();
      // Verify initial run rows exist
      experimentsTabs.getActiveExperimentsTable().findRows().should('have.length', 3);

      // Select the "Experiment" filter, enter a value to filter by
      experimentsTabs.getActiveExperimentsTable().selectFilterByName('Experiment');
      experimentsTabs.getActiveExperimentsTable().findFilterTextField().type('Test experiment 2');

      // Mock experiments (filtered by typed experiment name)
      experimentsTabs.mockGetExperiments(projectName, mockExperiments);

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
      const [experimentArchived] = mockArchivedExperiments;

      const activeExperimentsTable = experimentsTabs.getActiveExperimentsTable();

      activeExperimentsTable.mockArchiveExperiment(experimentToArchive.experiment_id, projectName);
      activeExperimentsTable
        .getRowByName(experimentToArchive.display_name)
        .findKebabAction('Archive')
        .click();

      experimentsTabs.mockGetExperiments(projectName, [
        mockExperiments[1],
        mockExperiments[2],
        experimentArchived,
      ]);
      archiveExperimentModal.findConfirmInput().type(experimentArchived.display_name);
      archiveExperimentModal.findSubmitButton().click();
      activeExperimentsTable.shouldRowNotBeVisible(experimentArchived.display_name);

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
        activeExperimentsTable.mockArchiveExperiment(activeExperiment.experiment_id, projectName);
        activeExperimentsTable.getRowByName(activeExperiment.display_name).findCheckbox().click();
      });

      activeExperimentsTable.findActionsKebab().findDropdownItem('Archive').click();
      experimentsTabs.mockGetExperiments(projectName, mockArchivedExperiments);
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
      experimentsTabs.mockGetExperiments(projectName, mockArchivedExperiments);
      experimentsTabs.visit(projectName);
      experimentsTabs.findArchivedTab().click();
    });
    it('restore a single experiment', () => {
      const [experimentToRestore] = mockArchivedExperiments;
      const [experimentRestored] = mockExperiments;

      const archivedExperimentsTable = experimentsTabs.getArchivedExperimentsTable();

      archivedExperimentsTable.mockRestoreExperiment(
        experimentToRestore.experiment_id,
        projectName,
      );
      archivedExperimentsTable
        .getRowByName(experimentToRestore.display_name)
        .findKebabAction('Restore')
        .click();

      experimentsTabs.mockGetExperiments(projectName, [
        mockArchivedExperiments[1],
        mockArchivedExperiments[2],
        experimentRestored,
      ]);
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
      mockArchivedExperiments.forEach((archivedExperiment) => {
        archivedExperimentsTable.mockRestoreExperiment(
          archivedExperiment.experiment_id,
          projectName,
        );
        archivedExperimentsTable
          .getRowByName(archivedExperiment.display_name)
          .findCheckbox()
          .click();
      });
      archivedExperimentsTable.findRestoreExperimentButton().click();
      experimentsTabs.mockGetExperiments(projectName, mockExperiments);
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

  describe('Runs page for active experiment', () => {
    const activeExperimentsTable = experimentsTabs.getActiveExperimentsTable();
    const [mockExperiment] = mockExperiments;

    beforeEach(() => {
      initIntercepts();
      experimentsTabs.mockGetExperiments(projectName, mockExperiments);
      experimentsTabs.visit(projectName);
      activeExperimentsTable.getRowByName(mockExperiment.display_name).find().find('a').click();
    });

    it('navigates to the runs page when clicking an experiment name', () => {
      verifyRelativeURL(`/experiments/${projectName}/${mockExperiment.experiment_id}/runs`);
      cy.findByLabelText('Breadcrumb').findByText(`Experiments - ${projectName}`);
    });

    it('has "Experiment" value pre-filled when on the "Create run" page', () => {
      pipelineRunsGlobal.findCreateRunButton().click();
      cy.findByLabelText('Experiment').contains(mockExperiment.display_name);
    });

    it('should display error state when the pipeline version deleted', () => {
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
        {
          path: {
            namespace: projectName,
            serviceName: 'dspa',
            runId: mockActiveRuns.run_id,
          },
        },
        mockActiveRuns,
      );
      activeRunsTable.getRowByName('Test active run 4').findColumnName('Test active run 4').click();
      pipelineRunDetails
        .findErrorState('run-graph-error-state')
        .should('have.text', 'Pipeline run graph unavailable');

      pipelineRunDetails.findDetailsTab().click();
      pipelineRunDetails.findDetailItem('Name').findValue().contains(mockActiveRuns.display_name);
      pipelineRunDetails
        .findDetailItem('Pipeline version')
        .findValue()
        .contains('No pipeline version');
      pipelineRunDetails.findDetailItem('Project').findValue().contains(projectName);
      pipelineRunDetails.findDetailItem('Run ID').findValue().contains(mockActiveRuns.run_id);
      pipelineRunDetails
        .findDetailItem('Workflow name')
        .findValue()
        .contains(mockActiveRuns.display_name);
      pipelineRunDetails.findPipelineSpecTab().click();
      pipelineRunDetails
        .findErrorState('pipeline-spec-error-state')
        .should('have.text', 'Pipeline spec unavailable');
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

describe('Runs page for archived experiment', () => {
  const archivedExperimentsTable = experimentsTabs.getArchivedExperimentsTable();
  const [mockArchivedExperiment] = mockArchivedExperiments;

  beforeEach(() => {
    initIntercepts();
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments/:experimentId',
      {
        path: {
          namespace: projectName,
          serviceName: 'dspa',
          experimentId: mockArchivedExperiment.experiment_id,
        },
      },
      mockArchivedExperiment,
    );
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs',
      {
        path: { namespace: projectName, serviceName: 'dspa' },
      },
      { runs: [buildMockRunKF({ storage_state: StorageStateKF.ARCHIVED })] },
    );

    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns',
      {
        path: { namespace: projectName, serviceName: 'dspa' },
      },
      { recurringRuns: [buildMockRecurringRunKF({ status: RecurringRunStatus.DISABLED })] },
    );
    experimentsTabs.mockGetExperiments(projectName, mockArchivedExperiments);
    experimentsTabs.visit(projectName);
    experimentsTabs.findArchivedTab().click();
    archivedExperimentsTable
      .getRowByName(mockArchivedExperiment.display_name)
      .find()
      .find('a')
      .click();
  });

  it('navigates to the runs page when clicking an experiment name', () => {
    verifyRelativeURL(
      `/experiments/${projectName}/${mockArchivedExperiment.experiment_id}/runs/archived`,
    );
    cy.findByLabelText('Breadcrumb').findByText(`Experiments - ${projectName}`);
  });

  it('has empty state on active runs tab', () => {
    pipelineRunsGlobal.findActiveRunsTab().click();
    cy.findByTestId('experiment-archived-empty-state').should('be.visible');
  });

  it('has restore button disabled on archived runs tab', () => {
    pipelineRunsGlobal.findArchivedRunsTab().click();
    archivedRunsTable.getRowByName('Test run').findCheckbox().click();
    pipelineRunsGlobal.findRestoreRunButton().should('have.class', 'pf-m-aria-disabled');
  });

  it('has no create schedule button on schedules tab', () => {
    pipelineRunsGlobal.findSchedulesTab().click();
    pipelineRecurringRunTable.getRowByName('Test recurring run').findCheckbox().click();
    pipelineRunsGlobal.findScheduleRunButton().should('not.exist');
  });
});

const initIntercepts = () => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
  cy.interceptK8sList(
    DataSciencePipelineApplicationModel,
    mockK8sResourceList([
      mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
    ]),
  );
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
  );
  cy.interceptK8s(
    RouteModel,
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-dspa',
      namespace: projectName,
    }),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: projectName, displayName: projectName }),
    ]),
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
    {
      path: { namespace: projectName, serviceName: 'dspa' },
    },
    buildMockPipelines([initialMockPipeline]),
  );

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs',
    {
      path: { namespace: projectName, serviceName: 'dspa' },
    },
    { runs: [mockActiveRuns] },
  );

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns',
    {
      path: { namespace: projectName, serviceName: 'dspa' },
    },
    { recurringRuns: [] },
  );

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments/:experimentId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        experimentId: mockExperiments[0].experiment_id,
      },
    },
    mockExperiments[0],
  );
};
