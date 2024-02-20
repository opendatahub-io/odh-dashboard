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
  buildMockJobKF,
  buildMockPipelineVersionsV2,
  buildMockPipelineVersionV2,
  buildMockPipelines,
  buildMockPipelineV2,
  buildMockExperimentKF,
} from '~/__mocks__';
import {
  activeRunsTable,
  pipelineRunsGlobal,
  pipelineRunFilterBar,
  pipelineRunJobTable,
  archivedRunsTable,
  restoreRunModal,
  bulkRestoreRunModal,
  archiveRunModal,
  bulkArchiveRunModal,
} from '~/__tests__/cypress/cypress/pages/pipelines';

const projectName = 'test-project-filters';
const pipelineId = 'test-pipeline';

const mockActiveRuns = [
  buildMockRunKF({
    display_name: 'Test active run 1',
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
    display_name: 'Test active run 2',
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
    display_name: 'Test active run 3',
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

const mockExperimentIds = [...new Set(mockActiveRuns.map((mockRun) => mockRun.experiment_id))];
const mockVersionIds = [
  ...new Set(
    mockActiveRuns.map((mockRun) => mockRun.pipeline_version_reference.pipeline_version_id),
  ),
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

const mockJobs = [
  buildMockJobKF({
    display_name: 'test-pipeline',
    recurring_run_id: 'test-pipeline',
    experiment_id: 'test-experiment-1',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-1',
    },
  }),
  buildMockJobKF({
    display_name: 'other-pipeline',
    recurring_run_id: 'other-test-pipeline',
    experiment_id: 'test-experiment-2',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-2',
    },
  }),
  buildMockJobKF({
    display_name: 'another-pipeline',
    recurring_run_id: 'another-test-pipeline',
    experiment_id: 'test-experiment-1',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-2',
    },
  }),
];

const mockArchivedRuns = [
  buildMockRunKF({
    display_name: 'Test archived run 1',
    run_id: 'archived-run-1',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-1',
    },
    experiment_id: 'test-experiment-1',
    created_at: '2024-02-05T00:00:00Z',
    state: RuntimeStateKF.SUCCEEDED,
  }),
  buildMockRunKF({
    display_name: 'Test archived run 2',
    run_id: 'archived-run-2',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-1',
    },
    experiment_id: 'test-experiment-1',
    created_at: '2024-02-05T00:00:00Z',
    state: RuntimeStateKF.SUCCEEDED,
  }),
];

describe('Pipeline runs', () => {
  beforeEach(() => {
    initIntercepts();
  });

  describe('Active runs', () => {
    it('shows empty state', () => {
      activeRunsTable.mockGetActiveRuns([]);
      pipelineRunsGlobal.visit(projectName, 'active');
      activeRunsTable.findEmptyState().should('exist');
    });

    describe('with data', () => {
      beforeEach(() => {
        activeRunsTable.mockGetActiveRuns(mockActiveRuns);
        pipelineRunsGlobal.visit(projectName, 'active');
      });

      it('renders the page with table data', () => {
        activeRunsTable.findRowByName('Test active run 1');
      });

      it('archive a single run', () => {
        const [runToArchive] = mockActiveRuns;

        activeRunsTable.mockArchiveRun(runToArchive.run_id);
        activeRunsTable.selectRowActionByName(runToArchive.display_name, 'Archive');

        activeRunsTable.mockGetRuns([mockActiveRuns[1]], [runToArchive]);
        archiveRunModal.findConfirmInput().type(runToArchive.display_name);
        archiveRunModal.findSubmitButton().click();
        activeRunsTable.shouldRowNotBeVisible(runToArchive.display_name);

        pipelineRunsGlobal.findArchivedRunsTab().click();
        archivedRunsTable.findRowByName(runToArchive.display_name).should('exist');
      });

      it('archive multiple runs', () => {
        mockActiveRuns.forEach((activeRun) => {
          activeRunsTable.mockArchiveRun(activeRun.run_id);
          activeRunsTable.findRowByName(activeRun.display_name).findByLabelText('Checkbox').click();
        });

        activeRunsTable.findActionsKebab().findDropdownItem('Archive').click();
        activeRunsTable.mockGetRuns([], mockActiveRuns);
        bulkArchiveRunModal.findConfirmInput().type('Archive 3 runs');
        bulkArchiveRunModal.findSubmitButton().click();
        activeRunsTable.findEmptyState().should('exist');

        pipelineRunsGlobal.findArchivedRunsTab().click();
        mockActiveRuns.forEach((run) =>
          archivedRunsTable.findRowByName(run.display_name).should('exist'),
        );
      });

      describe('Table filter', () => {
        it('filter by run name', () => {
          // Verify initial run rows exist
          activeRunsTable.findRows().should('have.length', 3);

          // Select the "Name" filter, enter a value to filter by
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunsGlobal.selectFilterByName('Name'));
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunFilterBar.findNameInput().type('run 1'));

          // Mock runs (filtered by typed run name)
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.display_name.includes('run 1')),
            1,
          );

          // Verify only rows with the typed run name exist
          activeRunsTable.findRows().should('have.length', 1);
          activeRunsTable.findRowByName('Test active run 1');
        });

        it.only('filter by experiment', () => {
          // Mock initial list of experiments
          pipelineRunFilterBar.mockExperiments(mockExperiments);

          // Verify initial run rows exist
          activeRunsTable.findRows().should('have.length', 3);

          // Select the "Experiment" filter, enter a value to filter by
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunsGlobal.selectFilterByName('Experiment'));
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunFilterBar.findExperimentInput().type('Test Experiment 1'));

          // Mock runs (filtered by selected experiment)
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.experiment_id === 'test-experiment-1'),
            1,
          );

          // Select an experiment to filter by
          pipelineRunFilterBar.selectExperimentByName('Test Experiment 1');

          // Verify only rows with selected experiment exist
          activeRunsTable.findRows().should('have.length', 2);
          activeRunsTable.findRowByName('Test active run 1');
          activeRunsTable.findRowByName('Test active run 3');
        });

        it('filter by pipeline version', () => {
          // Verify initial run rows exist
          activeRunsTable.findRows().should('have.length', 3);

          // Select the "Pipeline version" filter, select a value to filter by
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunsGlobal.selectFilterByName('Pipeline version'));

          // Mock runs (filtered by selected version)
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter(
              (mockRun) =>
                mockRun.pipeline_version_reference.pipeline_version_id === 'test-version-1',
            ),
            1,
          );

          // Select version to filter by
          pipelineRunFilterBar.selectPipelineVersionByName('Test Version 1');

          // Verify only rows with selected experiment exist
          activeRunsTable.findRows().should('have.length', 1);
          activeRunsTable.findRowByName('Test active run 1');
        });

        it('filter by started', () => {
          // Verify initial run rows exist
          activeRunsTable.findRows().should('have.length', 3);

          // Select the "Started" filter, select a value to filter by
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunsGlobal.selectFilterByName('Started'));

          // Mock runs (filtered by start date), type a start date
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.created_at.includes('2024-02-10')),
            1,
          );
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunFilterBar.findStartDateInput().type('2024-02-10'));

          // Verify only rows with selected start date exist
          activeRunsTable.findRows().should('have.length', 1);
          activeRunsTable.findRowByName('Test active run 3');

          // Mock runs with a cleared filter before updating again
          activeRunsTable.mockGetRuns(mockActiveRuns, [], 1);
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunFilterBar.findStartDateInput().clear());

          // Mock runs with a start date not associated with those runs
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.created_at.includes('2024-02-15')),
            1,
          );
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunFilterBar.findStartDateInput().type('2024-02-15'));

          // Verify no results were found
          activeRunsTable.findEmptyResults().should('exist');
        });

        it('filter by status', () => {
          // Verify initial run rows exist
          activeRunsTable.findRows().should('have.length', 3);

          // Select the "Status" filter
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunsGlobal.selectFilterByName('Status'));

          // Mock runs (filtered by a status of 'RUNNING')
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.state === RuntimeStateKF.RUNNING),
            1,
          );
          // Select a filter value of 'RUNNING'
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() =>
              pipelineRunFilterBar.selectStatusByName(runtimeStateLabels[RuntimeStateKF.RUNNING]),
            );

          // Verify only rows with the selected status exist
          activeRunsTable.findRows().should('have.length', 1);
          activeRunsTable.findRowByName('Test active run 1');

          // Mock runs (filtered by a status of 'SUCCEEDED')
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.state === RuntimeStateKF.SUCCEEDED),
            1,
          );
          // Select a filter value of 'SUCCEEDED'
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() =>
              pipelineRunFilterBar.selectStatusByName(runtimeStateLabels[RuntimeStateKF.SUCCEEDED]),
            );

          // Verify only rows with the selected status exist
          activeRunsTable.findRows().should('have.length', 1);
          activeRunsTable.findRowByName('Test active run 2');

          // Mock runs (filtered by a status of 'CANCELED')
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.state === RuntimeStateKF.CANCELED),
            1,
          );
          // Select a filter value of 'CANCELED'
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() =>
              pipelineRunFilterBar.selectStatusByName(runtimeStateLabels[RuntimeStateKF.CANCELED]),
            );

          // Verify only rows with the selected status exist
          activeRunsTable.findRows().should('have.length', 1);
          activeRunsTable.findRowByName('Test active run 3');
        });
      });
    });
  });

  describe('Archived runs', () => {
    it('shows empty state', () => {
      archivedRunsTable.mockGetArchivedRuns([]);
      pipelineRunsGlobal.visit(projectName, 'archived');
      archivedRunsTable.findEmptyState().should('exist');
    });

    describe('with data', () => {
      beforeEach(() => {
        archivedRunsTable.mockGetArchivedRuns(mockArchivedRuns);
        pipelineRunsGlobal.visit(projectName, 'archived');
      });

      it('renders the page with table data', () => {
        mockArchivedRuns.forEach((archivedRun) =>
          archivedRunsTable.findRowByName(archivedRun.display_name).should('exist'),
        );
      });

      it('restore a single run', () => {
        const [runToRestore] = mockArchivedRuns;

        archivedRunsTable.mockRestoreRun(runToRestore.run_id);
        archivedRunsTable.selectRowActionByName(runToRestore.display_name, 'Restore');

        archivedRunsTable.mockGetRuns([runToRestore], [mockArchivedRuns[1]]);
        restoreRunModal.findSubmitButton().click();
        archivedRunsTable.shouldRowNotBeVisible(runToRestore.display_name);

        pipelineRunsGlobal.findActiveRunsTab().click();
        activeRunsTable.findRowByName(runToRestore.display_name).should('exist');
      });

      it('restore multiple runs', () => {
        mockArchivedRuns.forEach((archivedRun) => {
          archivedRunsTable.mockRestoreRun(archivedRun.run_id);
          archivedRunsTable
            .findRowByName(archivedRun.display_name)
            .findByLabelText('Checkbox')
            .click();
        });
        pipelineRunsGlobal.findRestoreRunButton().click();
        archivedRunsTable.mockGetRuns(mockArchivedRuns, []);
        bulkRestoreRunModal.findSubmitButton().click();
        archivedRunsTable.findEmptyState().should('exist');

        pipelineRunsGlobal.findActiveRunsTab().click();
        mockArchivedRuns.forEach((run) =>
          activeRunsTable.findRowByName(run.display_name).should('exist'),
        );
      });
    });
  });

  describe('Schedules', () => {
    it('shows empty state', () => {
      pipelineRunJobTable.mockGetJobs([]);
      pipelineRunsGlobal.visit(projectName, 'scheduled');
      pipelineRunJobTable.findEmptyState().should('exist');
    });

    describe('with data', () => {
      beforeEach(() => {
        pipelineRunJobTable.mockGetJobs(mockJobs);
        pipelineRunsGlobal.visit(projectName, 'scheduled');
      });

      it('renders the page with table rows', () => {
        pipelineRunJobTable.find().should('exist');
        pipelineRunJobTable.findRowByName('test-pipeline').should('exist');
        pipelineRunJobTable.findRowByName('other-pipeline').should('exist');
        pipelineRunJobTable.findRowByName('another-pipeline').should('exist');
      });

      it('can disable a job', () => {
        pipelineRunJobTable.mockDisableJob(mockJobs[0]).as('disableJob');
        pipelineRunJobTable.findStatusSwitchByRowName(mockJobs[0].display_name).click();
        cy.wait('@disableJob');
      });

      describe('Table filter', () => {
        it('filter by name', () => {
          // Verify initial job rows exist
          pipelineRunJobTable.findRows().should('have.length', 3);

          // Select the "Name" filter, enter a value to filter by
          pipelineRunJobTable.selectFilterByName('Name');
          pipelineRunJobTable.findFilterTextField().type('test-pipeline');

          // Mock jobs (filtered by typed job name)
          pipelineRunJobTable.mockGetJobs(
            mockJobs.filter((mockJob) => mockJob.display_name.includes('test-pipeline')),
          );

          // Verify only rows with the typed job name exist
          pipelineRunJobTable.findRows().should('have.length', 1);
          pipelineRunJobTable.findRowByName('test-pipeline');
        });
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
