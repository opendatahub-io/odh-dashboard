/* eslint-disable camelcase */
import startCase from 'lodash-es/startCase';
import { RuntimeStateKF, runtimeStateLabels } from '~/concepts/pipelines/kfTypes';
import {
  mockK8sResourceList,
  mockProjectK8sResource,
  buildMockRunKF,
  buildMockPipelineVersionsV2,
  buildMockPipelineVersionV2,
  buildMockPipelines,
  buildMockPipelineV2,
  buildMockExperimentKF,
  buildMockRecurringRunKF,
} from '~/__mocks__';
import {
  activeRunsTable,
  pipelineRunsGlobal,
  pipelineRunFilterBar,
  pipelineRecurringRunTable,
  archivedRunsTable,
  restoreRunModal,
  bulkRestoreRunModal,
  archiveRunModal,
  bulkArchiveRunModal,
  cloneRunPage,
  cloneSchedulePage,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import { ProjectModel } from '~/__tests__/cypress/cypress/utils/models';
import { tablePagination } from '~/__tests__/cypress/cypress/pages/components/Pagination';
import { dspaIntercepts } from '~/__tests__/cypress/cypress/tests/mocked/pipelines/intercepts';

const projectName = 'test-project-filters';
const pipelineId = 'test-pipeline';
const pipelineVersionId = 'test-version';

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
    mockActiveRuns.map((mockRun) => mockRun.pipeline_version_reference?.pipeline_version_id),
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

const mockRecurringRuns = [
  buildMockRecurringRunKF({
    display_name: 'test-pipeline',
    recurring_run_id: 'test-pipeline',
    experiment_id: 'test-experiment-1',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-1',
    },
  }),
  buildMockRecurringRunKF({
    display_name: 'other-pipeline',
    recurring_run_id: 'other-test-pipeline',
    experiment_id: 'test-experiment-2',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-2',
    },
  }),
  buildMockRecurringRunKF({
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
      pipeline_version_id: 'test-version-2',
    },
    experiment_id: 'test-experiment-1',
    created_at: '2024-02-20T00:00:00Z',
    state: RuntimeStateKF.SUCCEEDED,
  }),
];

describe('Pipeline runs', () => {
  beforeEach(() => {
    initIntercepts();
  });

  describe('Active runs', () => {
    describe('empty state', () => {
      beforeEach(() => {
        activeRunsTable.mockGetActiveRuns([], projectName);
        pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'active');
      });

      it('shows empty state', () => {
        activeRunsTable.findEmptyState().should('exist');
      });

      it('navigate to create run page', () => {
        pipelineRunsGlobal.findCreateRunButton().click();
        verifyRelativeURL(
          `/pipelines/${projectName}/${pipelineId}/${pipelineVersionId}/runs/create`,
        );
      });
    });

    describe('table pagination', () => {
      it('Active run table pagination', () => {
        const mockRuns = Array.from({ length: 15 }, (_, i) =>
          buildMockRunKF({
            display_name: `Test active run-${i}`,
            run_id: `run-${i}`,
            pipeline_version_reference: {
              pipeline_id: pipelineId,
              pipeline_version_id: `test-version-${i}`,
            },
            experiment_id: `test-experiment-${i}`,
            created_at: '2024-02-05T00:00:00Z',
            state: RuntimeStateKF.SUCCEEDED,
          }),
        );
        cy.interceptOdh(
          'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs',
          {
            path: { namespace: projectName, serviceName: 'dspa' },
          },
          {
            runs: mockRuns.slice(0, 10),
            total_size: 15,
            next_page_token: 'page-2-token',
          },
        ).as('getActiveRuns');

        pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'active');

        cy.wait('@getActiveRuns').then((interception) => {
          expect(interception.request.query).to.eql({
            sort_by: 'created_at desc',
            page_size: '10',
            filter:
              '{"predicates":[{"key":"storage_state","operation":"EQUALS","string_value":"AVAILABLE"},{"key":"pipeline_version_id","operation":"EQUALS","string_value":"test-version"}]}',
          });
        });
        activeRunsTable.findRows().should('have.length', 10);
        activeRunsTable.getRowByName('Test active run-0').find().should('exist');

        const pagination = tablePagination.top;

        // test Next button
        pagination.findPreviousButton().should('be.disabled');
        cy.interceptOdh(
          'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs',
          {
            path: { namespace: projectName, serviceName: 'dspa' },
          },
          {
            runs: mockRuns.slice(10, 15),
            total_size: 15,
          },
        ).as('refreshActiveRuns');
        pagination.findNextButton().click();

        cy.wait('@refreshActiveRuns').then((interception) => {
          expect(interception.request.query).to.eql({
            sort_by: 'created_at desc',
            page_size: '10',
            filter:
              '{"predicates":[{"key":"storage_state","operation":"EQUALS","string_value":"AVAILABLE"},{"key":"pipeline_version_id","operation":"EQUALS","string_value":"test-version"}]}',
            page_token: 'page-2-token',
          });
        });
        activeRunsTable.getRowByName('Test active run-14').find().should('exist');
        activeRunsTable.findRows().should('have.length', 5);

        // test Previous button
        pagination.findNextButton().should('be.disabled');
        cy.interceptOdh(
          'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs',
          {
            path: { namespace: projectName, serviceName: 'dspa' },
          },
          {
            runs: mockRuns.slice(0, 10),
            total_size: 15,
          },
        );
        pagination.findPreviousButton().click();
        activeRunsTable.getRowByName('Test active run-0').find().should('exist');
        activeRunsTable.findRows().should('have.length', 10);

        // 20 per page
        cy.interceptOdh(
          'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs',
          {
            path: { namespace: projectName, serviceName: 'dspa' },
          },
          {
            runs: mockRuns.slice(0, 15),
            total_size: 15,
          },
        );
        pagination.selectToggleOption('20 per page');
        activeRunsTable.findRows().should('have.length', 15);
        activeRunsTable.getRowByName('Test active run-0').find().should('exist');
        activeRunsTable.getRowByName('Test active run-14').find().should('exist');
        pagination.findNextButton().should('be.disabled');
        pagination.findPreviousButton().should('be.disabled');
        pagination.selectToggleOption('10 per page');
      });
    });

    describe('with data', () => {
      beforeEach(() => {
        activeRunsTable.mockGetActiveRuns(mockActiveRuns, projectName);
      });

      it('renders the page with table data', () => {
        pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'active');
        activeRunsTable.getRowByName('Test active run 1').find().should('exist');
      });

      it('archive a single run', () => {
        pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'active');
        const [runToArchive] = mockActiveRuns;

        activeRunsTable.mockArchiveRun(runToArchive.run_id, projectName);
        activeRunsTable.getRowByName(runToArchive.display_name).findKebabAction('Archive').click();

        activeRunsTable.mockGetRuns([mockActiveRuns[1]], [runToArchive], projectName);
        archiveRunModal.findConfirmInput().type(runToArchive.display_name);
        archiveRunModal.findSubmitButton().click();
        activeRunsTable.shouldRowNotBeVisible(runToArchive.display_name);

        pipelineRunsGlobal.findArchivedRunsTab().click();
        archivedRunsTable.getRowByName(runToArchive.display_name).find().should('exist');
      });

      it('archive multiple runs', () => {
        pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'active');
        mockActiveRuns.forEach((activeRun) => {
          activeRunsTable.mockArchiveRun(activeRun.run_id, projectName);
          activeRunsTable.getRowByName(activeRun.display_name).findCheckbox().click();
        });

        activeRunsTable.findActionsKebab().findDropdownItem('Archive').click();
        activeRunsTable.mockGetRuns([], mockActiveRuns, projectName);
        bulkArchiveRunModal.findConfirmInput().type('Archive 3 runs');
        bulkArchiveRunModal.findSubmitButton().click();
        activeRunsTable.findEmptyState().should('exist');

        pipelineRunsGlobal.findArchivedRunsTab().click();
        mockActiveRuns.forEach((run) =>
          archivedRunsTable.getRowByName(run.display_name).find().should('exist'),
        );
      });

      describe('Navigation', () => {
        it('navigate to create run page', () => {
          pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'active');
          pipelineRunsGlobal.findCreateRunButton().click();
          verifyRelativeURL(
            `/pipelines/${projectName}/${pipelineId}/${pipelineVersionId}/runs/create`,
          );
        });

        it('navigate to clone run page', () => {
          cloneRunPage.mockGetExperiments(projectName, mockExperiments);
          cloneRunPage.mockGetExperiment(projectName, mockExperiments[0]);
          cy.visitWithLogin(`/experiments/${projectName}/test-experiment-1/runs`);

          activeRunsTable
            .getRowByName(mockActiveRuns[0].display_name)
            .findKebabAction('Duplicate')
            .click();

          verifyRelativeURL(
            `/experiments/${projectName}/test-experiment-1/runs/clone/${mockActiveRuns[0].run_id}`,
          );
        });

        it('navigate between tabs', () => {
          pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'active');
          pipelineRunsGlobal.findArchivedRunsTab().click();
          verifyRelativeURL(
            `/pipelines/${projectName}/${pipelineId}/${pipelineVersionId}/runs/archived`,
          );
          pipelineRunsGlobal.findActiveRunsTab().click();
          verifyRelativeURL(
            `/pipelines/${projectName}/${pipelineId}/${pipelineVersionId}/runs/active`,
          );
          pipelineRunsGlobal.findSchedulesTab().click();
          verifyRelativeURL(
            `/pipelines/${projectName}/${pipelineId}/${pipelineVersionId}/schedules`,
          );
        });

        it('navigate to run details page', () => {
          pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'active');
          activeRunsTable
            .getRowByName(mockActiveRuns[0].display_name)
            .findColumnName(mockActiveRuns[0].display_name)
            .click();

          verifyRelativeURL(
            `/pipelines/${projectName}/${pipelineId}/${pipelineVersionId}/runs/${mockActiveRuns[0].run_id}`,
          );
        });
      });

      describe('Table filter', () => {
        it('filter by name', () => {
          pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'active');

          // Verify initial run rows exist
          activeRunsTable.findRows().should('have.length', 3);

          // Select the "Run" filter, enter a value to filter by
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunsGlobal.selectFilterByName('Run'));
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunFilterBar.findNameInput().type('run 1'));

          // Mock runs (filtered by typed run name)
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.display_name.includes('run 1')),
            projectName,
            1,
          );

          // Verify only rows with the typed run name exist
          activeRunsTable.findRows().should('have.length', 1);
          activeRunsTable.getRowByName('Test active run 1').find().should('exist');
        });

        it('filter by experiment', () => {
          pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'active');

          // Mock initial list of experiments
          pipelineRunFilterBar.mockExperiments(mockExperiments, projectName);

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
            projectName,
            1,
          );

          // Select an experiment to filter by
          pipelineRunFilterBar.selectExperimentByName('Test Experiment 1');

          // Verify only rows with selected experiment exist
          activeRunsTable.findRows().should('have.length', 2);
          activeRunsTable.getRowByName('Test active run 1').find().should('exist');
          activeRunsTable.getRowByName('Test active run 3').find().should('exist');
        });

        it('filter by created after', () => {
          pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'active');

          // Verify initial run rows exist
          activeRunsTable.findRows().should('have.length', 3);

          // Select the "Started" filter, select a value to filter by
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunsGlobal.selectFilterByName('Created after'));

          // Mock runs (filtered by start date), type a start date
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.created_at.includes('2024-02-10')),
            projectName,
            1,
          );
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunFilterBar.findStartDateInput().type('2024-02-10'));

          // Verify only rows with selected start date exist
          activeRunsTable.findRows().should('have.length', 1);
          activeRunsTable.getRowByName('Test active run 3').find().should('exist');

          // Mock runs with a cleared filter before updating again
          activeRunsTable.mockGetRuns(mockActiveRuns, [], projectName, 1);
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunFilterBar.findStartDateInput().clear());

          // Mock runs with a start date not associated with those runs
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.created_at.includes('2024-02-15')),
            projectName,
            1,
          );
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunFilterBar.findStartDateInput().type('2024-02-15'));

          // Verify no results were found
          activeRunsTable.findEmptyResults().should('exist');
        });

        it('filter by status', () => {
          pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'active');

          // Verify initial run rows exist
          activeRunsTable.findRows().should('have.length', 3);

          // Select the "Status" filter
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunsGlobal.selectFilterByName('Status'));

          // Mock runs (filtered by a status of 'RUNNING')
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.state === RuntimeStateKF.RUNNING),
            projectName,
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
          activeRunsTable.getRowByName('Test active run 1').find().should('exist');

          // Mock runs (filtered by a status of 'SUCCEEDED')
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.state === RuntimeStateKF.SUCCEEDED),
            projectName,
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
          activeRunsTable.getRowByName('Test active run 2').find().should('exist');

          // Mock runs (filtered by a status of 'CANCELED')
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.state === RuntimeStateKF.CANCELED),
            projectName,
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
          activeRunsTable.getRowByName('Test active run 3').find().should('exist');
        });

        it('Sort by Name', () => {
          pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'active');

          pipelineRunFilterBar.findSortButtonForActive('Run').click();
          pipelineRunFilterBar.findSortButtonForActive('Run').should(be.sortAscending);
          pipelineRunFilterBar.findSortButtonForActive('Run').click();
          pipelineRunFilterBar.findSortButtonForActive('Run').should(be.sortDescending);
        });
      });
    });
  });

  describe('Archived runs', () => {
    it('shows empty state', () => {
      archivedRunsTable.mockGetArchivedRuns([], projectName);
      pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'archived');
      archivedRunsTable.findEmptyState().should('exist');
    });

    describe('with data', () => {
      beforeEach(() => {
        archivedRunsTable.mockGetArchivedRuns(mockArchivedRuns, projectName);
        pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'archived');
      });

      it('renders the page with table data', () => {
        mockArchivedRuns.forEach((archivedRun) =>
          archivedRunsTable.getRowByName(archivedRun.display_name).find().should('exist'),
        );
      });

      it('restore a single run', () => {
        const [runToRestore] = mockArchivedRuns;

        archivedRunsTable.mockRestoreRun(runToRestore.run_id, projectName);
        archivedRunsTable
          .getRowByName(runToRestore.display_name)
          .findKebabAction('Restore')
          .click();

        archivedRunsTable.mockGetRuns([runToRestore], [mockArchivedRuns[1]], projectName);
        restoreRunModal.findSubmitButton().click();
        archivedRunsTable.shouldRowNotBeVisible(runToRestore.display_name);

        pipelineRunsGlobal.findActiveRunsTab().click();
        activeRunsTable.getRowByName(runToRestore.display_name).find().should('exist');
      });

      it('restore multiple runs', () => {
        mockArchivedRuns.forEach((archivedRun) => {
          archivedRunsTable.mockRestoreRun(archivedRun.run_id, projectName);
          archivedRunsTable.getRowByName(archivedRun.display_name).findCheckbox().click();
        });
        pipelineRunsGlobal.findRestoreRunButton().click();
        archivedRunsTable.mockGetRuns(mockArchivedRuns, [], projectName);
        bulkRestoreRunModal.findSubmitButton().click();
        archivedRunsTable.findEmptyState().should('exist');

        pipelineRunsGlobal.findActiveRunsTab().click();
        mockArchivedRuns.forEach((run) =>
          activeRunsTable.getRowByName(run.display_name).find().should('exist'),
        );
      });

      describe('Table filter', () => {
        it('filter by run name', () => {
          // Verify initial run rows exist
          archivedRunsTable.findRows().should('have.length', 2);

          // Select the "Name" filter, enter a value to filter by
          pipelineRunsGlobal
            .findArchivedRunsToolbar()
            .within(() => pipelineRunsGlobal.selectFilterByName('Run'));
          pipelineRunsGlobal
            .findArchivedRunsToolbar()
            .within(() => pipelineRunFilterBar.findNameInput().type('run 1'));

          // Mock runs (filtered by typed run name)
          archivedRunsTable.mockGetArchivedRuns(
            mockArchivedRuns.filter((mockRun) => mockRun.display_name.includes('run 1')),
            projectName,
            1,
          );

          // Verify only rows with the typed run name exist
          archivedRunsTable.findRows().should('have.length', 1);
          archivedRunsTable.getRowByName('Test archived run 1').find().should('exist');
        });

        it('filter by experiment', () => {
          // Mock initial list of experiments
          pipelineRunFilterBar.mockExperiments(mockExperiments, projectName);

          // Verify initial run rows exist
          archivedRunsTable.findRows().should('have.length', 2);

          // Select the "Experiment" filter, enter a value to filter by
          pipelineRunsGlobal
            .findArchivedRunsToolbar()
            .within(() => pipelineRunsGlobal.selectFilterByName('Experiment'));
          pipelineRunsGlobal
            .findArchivedRunsToolbar()
            .within(() => pipelineRunFilterBar.findExperimentInput().type('Test Experiment 1'));

          // Mock runs (filtered by selected experiment)
          archivedRunsTable.mockGetArchivedRuns(
            mockArchivedRuns.filter((mockRun) => mockRun.experiment_id === 'test-experiment-1'),
            projectName,
            1,
          );

          // Select an experiment to filter by
          pipelineRunFilterBar.selectExperimentByName('Test Experiment 1');

          // Verify only rows with selected experiment exist
          archivedRunsTable.findRows().should('have.length', 2);
          archivedRunsTable.getRowByName('Test archived run 1').find().should('exist');
          archivedRunsTable.getRowByName('Test archived run 2').find().should('exist');
        });

        it('filter by created after', () => {
          // Verify initial run rows exist
          archivedRunsTable.findRows().should('have.length', 2);

          // Select the "Started" filter, select a value to filter by
          pipelineRunsGlobal
            .findArchivedRunsToolbar()
            .within(() => pipelineRunsGlobal.selectFilterByName('Created after'));

          // Mock runs (filtered by start date), type a start date
          archivedRunsTable.mockGetArchivedRuns(
            mockArchivedRuns.filter((mockRun) => mockRun.created_at.includes('2024-02-05')),
            projectName,
            1,
          );
          pipelineRunsGlobal
            .findArchivedRunsToolbar()
            .within(() => pipelineRunFilterBar.findStartDateInput().type('2024-02-05'));

          // Verify only rows with selected start date exist
          archivedRunsTable.findRows().should('have.length', 1);
          archivedRunsTable.getRowByName('Test archived run 1').find().should('exist');
          pipelineRunsGlobal
            .findArchivedRunsToolbar()
            .within(() => pipelineRunFilterBar.findStartDateInput().clear());

          // Mock runs with a start date not associated with those runs
          archivedRunsTable.mockGetArchivedRuns(
            mockArchivedRuns.filter((mockRun) => mockRun.created_at.includes('2024-02-15')),
            projectName,
            1,
          );
          pipelineRunsGlobal
            .findArchivedRunsToolbar()
            .within(() => pipelineRunFilterBar.findStartDateInput().type('2024-02-15'));

          // Verify no results were found
          archivedRunsTable.findEmptyResults().should('exist');
        });

        it('filter by status', () => {
          // Verify initial run rows exist
          archivedRunsTable.findRows().should('have.length', 2);

          // Select the "Status" filter
          pipelineRunsGlobal
            .findArchivedRunsToolbar()
            .within(() => pipelineRunsGlobal.selectFilterByName('Status'));

          // Mock runs (filtered by a status of 'SUCCEEDED')
          archivedRunsTable.mockGetArchivedRuns(
            mockArchivedRuns.filter((mockRun) => mockRun.state === RuntimeStateKF.SUCCEEDED),
            projectName,
            1,
          );
          // Select a filter value of 'SUCCEEDED'
          pipelineRunsGlobal
            .findArchivedRunsToolbar()
            .within(() =>
              pipelineRunFilterBar.selectStatusByName(runtimeStateLabels[RuntimeStateKF.SUCCEEDED]),
            );

          // Verify only rows with the selected status exist
          archivedRunsTable.findRows().should('have.length', 2);
          archivedRunsTable.getRowByName('Test archived run 1').find().should('exist');
          archivedRunsTable.getRowByName('Test archived run 2').find().should('exist');

          // Mock runs (filtered by a status of 'RUNNING')
          archivedRunsTable.mockGetArchivedRuns(
            mockArchivedRuns.filter((mockRun) => mockRun.state === RuntimeStateKF.RUNNING),
            projectName,
            1,
          );
          // Select a filter value of 'RUNNING'
          pipelineRunsGlobal
            .findArchivedRunsToolbar()
            .within(() =>
              pipelineRunFilterBar.selectStatusByName(runtimeStateLabels[RuntimeStateKF.RUNNING]),
            );

          // Verify no results were found
          archivedRunsTable.findEmptyResults().should('exist');
        });

        it('Sort by Name', () => {
          pipelineRunFilterBar.findSortButtonForArchive('Run').click();
          pipelineRunFilterBar.findSortButtonForArchive('Run').should(be.sortAscending);
          pipelineRunFilterBar.findSortButtonForArchive('Run').click();
          pipelineRunFilterBar.findSortButtonForArchive('Run').should(be.sortDescending);
        });
      });
    });
  });

  describe('Schedules', () => {
    describe('empty state', () => {
      beforeEach(() => {
        pipelineRecurringRunTable.mockGetRecurringRuns([], projectName);
        pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'scheduled');
      });

      it('shows empty state', () => {
        pipelineRecurringRunTable.findEmptyState().should('exist');
      });

      it('navigate to create schedule page', () => {
        pipelineRunsGlobal.findScheduleRunButton().click();
        verifyRelativeURL(
          `/pipelines/${projectName}/${pipelineId}/${pipelineVersionId}/schedules/create`,
        );
      });
    });

    it('shows empty state', () => {
      pipelineRecurringRunTable.mockGetRecurringRuns([], projectName);
      pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'scheduled');
      pipelineRecurringRunTable.findEmptyState().should('exist');
    });

    describe('table pagination', () => {
      it('Scheduled run table pagination', () => {
        const mockRuns = Array.from({ length: 15 }, (_, i) =>
          buildMockRecurringRunKF({
            display_name: `another-pipeline-${i}`,
            recurring_run_id: `another-test-pipeline-${i}`,
            experiment_id: `test-experiment-${i}`,
            pipeline_version_reference: {
              pipeline_id: pipelineId,
              pipeline_version_id: `test-version-${i}`,
            },
          }),
        );

        cy.interceptOdh(
          'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns',
          {
            path: { namespace: projectName, serviceName: 'dspa' },
          },
          {
            recurringRuns: mockRuns.slice(0, 10),
            total_size: 15,
            next_page_token: 'page-2-token',
          },
        ).as('getScheduledRuns');
        pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'scheduled');

        cy.wait('@getScheduledRuns').then((interception) => {
          expect(interception.request.query).to.eql({
            filter:
              '{"predicates":[{"key":"pipeline_version_id","operation":"EQUALS","string_value":"test-version"}]}',
            sort_by: 'created_at desc',
            page_size: '10',
          });
        });

        pipelineRecurringRunTable.getRowByName('another-pipeline-0').find().should('exist');
        pipelineRecurringRunTable.findRows().should('have.length', 10);

        const pagination = tablePagination.top;

        // test Next button
        pagination.findFirstButton().should('be.disabled');
        pagination.findPreviousButton().should('be.disabled');
        cy.interceptOdh(
          'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns',
          {
            path: { namespace: projectName, serviceName: 'dspa' },
          },
          {
            recurringRuns: mockRuns.slice(10, 15),
            total_size: 15,
          },
        ).as('refreshScheduledRuns');
        pagination.findNextButton().click();

        cy.wait('@refreshScheduledRuns').then((interception) => {
          expect(interception.request.query).to.eql({
            filter:
              '{"predicates":[{"key":"pipeline_version_id","operation":"EQUALS","string_value":"test-version"}]}',
            sort_by: 'created_at desc',
            page_size: '10',
            page_token: 'page-2-token',
          });
        });

        pagination.findInput().should('have.value', '2');
        pipelineRecurringRunTable.getRowByName('another-pipeline-14').find().should('exist');
        pipelineRecurringRunTable.findRows().should('have.length', 5);

        //test first button
        pagination.findLastButton().should('be.disabled');
        pagination.findNextButton().should('be.disabled');
        cy.interceptOdh(
          'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns',
          {
            path: { namespace: projectName, serviceName: 'dspa' },
          },
          {
            recurringRuns: mockRuns.slice(0, 10),
            total_size: 15,
            next_page_token: 'new-page-token',
          },
        );
        pagination.findFirstButton().click();
        pagination.findInput().should('have.value', '1');
        pipelineRecurringRunTable.getRowByName('another-pipeline-0').find().should('exist');
        pipelineRecurringRunTable.findRows().should('have.length', 10);

        //test last button
        pagination.findFirstButton().should('be.disabled');
        pagination.findPreviousButton().should('be.disabled');
        cy.interceptOdh(
          'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns',
          {
            path: { namespace: projectName, serviceName: 'dspa' },
          },
          {
            recurringRuns: mockRuns.slice(10, 15),
            total_size: 15,
          },
        ).as('refreshPipelineRecurringRuns');

        pagination.findLastButton().click();
        pagination.findInput().should('have.value', Math.ceil(15 / 10));
        pipelineRecurringRunTable.getRowByName('another-pipeline-14').find().should('exist');
        pipelineRecurringRunTable.findRows().should('have.length', 5);

        cy.wait('@refreshPipelineRecurringRuns').then((interception) => {
          expect(interception.request.query).to.eql({
            filter:
              '{"predicates":[{"key":"pipeline_version_id","operation":"EQUALS","string_value":"test-version"}]}',
            sort_by: 'created_at desc',
            page_size: '10',
            page_token: 'new-page-token',
          });
        });

        // test Previous button
        pagination.findLastButton().should('be.disabled');
        pagination.findNextButton().should('be.disabled');
        cy.interceptOdh(
          'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns',
          {
            path: { namespace: projectName, serviceName: 'dspa' },
          },
          {
            recurringRuns: mockRuns.slice(0, 10),
            total_size: 15,
          },
        );
        pagination.findPreviousButton().click();
        pagination.findInput().should('have.value', '1');
        pipelineRecurringRunTable.getRowByName('another-pipeline-0').find().should('exist');
        pipelineRecurringRunTable.findRows().should('have.length', 10);

        // 20 per page
        cy.interceptOdh(
          'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns',
          {
            path: { namespace: projectName, serviceName: 'dspa' },
          },
          {
            recurringRuns: mockRuns.slice(0, 15),
            total_size: 15,
          },
        );

        pagination.selectToggleOption('20 per page');

        pipelineRecurringRunTable.getRowByName('another-pipeline-0').find().should('exist');
        pipelineRecurringRunTable.getRowByName('another-pipeline-14').find().should('exist');
        pipelineRecurringRunTable.findRows().should('have.length', 15);
        pagination.findLastButton().should('be.disabled');
        pagination.findNextButton().should('be.disabled');
        pagination.findPreviousButton().should('be.disabled');
        pagination.findFirstButton().should('be.disabled');
        pagination.findInput().should('have.value', Math.ceil(15 / 20));
      });
    });

    describe('with data', () => {
      beforeEach(() => {
        pipelineRecurringRunTable.mockGetRecurringRuns(mockRecurringRuns, projectName);
      });

      it('renders the page with table rows', () => {
        pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'scheduled');
        pipelineRecurringRunTable.find().should('exist');
        pipelineRecurringRunTable.getRowByName('test-pipeline').find().should('exist');
        pipelineRecurringRunTable.getRowByName('other-pipeline').find().should('exist');
        pipelineRecurringRunTable.getRowByName('another-pipeline').find().should('exist');
      });

      it('can disable a recurring run', () => {
        pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'scheduled');
        pipelineRecurringRunTable
          .mockDisableRecurringRun(mockRecurringRuns[0], projectName)
          .as('disableRecurringRun');
        pipelineRecurringRunTable
          .getRowByName(mockRecurringRuns[0].display_name)
          .findStatusSwitchByRowName()
          .click();
        cy.wait('@disableRecurringRun');
      });

      describe('Navigation', () => {
        it('navigate to create scheduled run page', () => {
          pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'scheduled');
          pipelineRunsGlobal.findScheduleRunButton().click();
          verifyRelativeURL(
            `/pipelines/${projectName}/${pipelineId}/${pipelineVersionId}/schedules/create`,
          );
        });

        it('navigate to clone scheduled run page', () => {
          cloneSchedulePage.mockGetExperiments(projectName, mockExperiments);
          cloneSchedulePage.mockGetExperiment(projectName, mockExperiments[0]);
          cy.visitWithLogin(`/experiments/${projectName}/test-experiment-1/runs`);

          pipelineRunsGlobal.findSchedulesTab().click();
          pipelineRecurringRunTable
            .getRowByName(mockRecurringRuns[0].display_name)
            .findKebabAction('Duplicate')
            .click();

          verifyRelativeURL(
            `/experiments/${projectName}/test-experiment-1/schedules/clone/${mockRecurringRuns[0].recurring_run_id}`,
          );
        });

        it('navigate to scheduled run details page', () => {
          pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'scheduled');
          pipelineRunsGlobal.findSchedulesTab().click();
          pipelineRecurringRunTable
            .getRowByName(mockRecurringRuns[0].display_name)
            .findColumnName(mockRecurringRuns[0].display_name)
            .click();
          verifyRelativeURL(
            `/pipelines/${projectName}/${pipelineId}/${pipelineVersionId}/schedules/${mockRecurringRuns[0].recurring_run_id}`,
          );
        });
      });

      describe('Table filter', () => {
        it('filter by name', () => {
          pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'scheduled');
          pipelineRunsGlobal.findSchedulesTab().click();

          // Verify initial recurring run rows exist
          pipelineRecurringRunTable.findRows().should('have.length', 3);

          // Select the "Schedule" filter, enter a value to filter by
          pipelineRecurringRunTable.selectFilterByName('Schedule');
          pipelineRecurringRunTable.findFilterTextField().type('test-pipeline');

          // Mock recurring runs (filtered by typed recurring run name)
          pipelineRecurringRunTable.mockGetRecurringRuns(
            mockRecurringRuns.filter((mockRecurringRun) =>
              mockRecurringRun.display_name.includes('test-pipeline'),
            ),
            projectName,
          );

          // Verify only rows with the typed recurring run name exist
          pipelineRecurringRunTable.findRows().should('have.length', 1);
          pipelineRecurringRunTable.getRowByName('test-pipeline').find().should('exist');
        });

        it('Sort by Name', () => {
          pipelineRunsGlobal.visit(projectName, pipelineId, pipelineVersionId, 'scheduled');
          pipelineRunsGlobal.findSchedulesTab().click();

          pipelineRunFilterBar.findSortButtonforSchedules('Schedule').click();
          pipelineRunFilterBar.findSortButtonforSchedules('Schedule').should(be.sortAscending);
          pipelineRunFilterBar.findSortButtonforSchedules('Schedule').click();
          pipelineRunFilterBar.findSortButtonforSchedules('Schedule').should(be.sortDescending);
        });
      });
    });
  });
});

const initIntercepts = () => {
  dspaIntercepts(projectName);

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: projectName, displayName: 'Test project' }),
    ]),
  );

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
    {
      path: { namespace: projectName, serviceName: 'dspa' },
    },
    buildMockPipelines([buildMockPipelineV2({ pipeline_id: pipelineId })]),
  );

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId,
      },
    },
    buildMockPipelineV2({
      pipeline_id: pipelineId,
    }),
  );

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
    { path: { namespace: projectName, serviceName: 'dspa', pipelineId } },
    buildMockPipelineVersionsV2(mockVersions),
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId,
        pipelineVersionId,
      },
    },
    buildMockPipelineVersionV2({ pipeline_id: pipelineId, pipeline_version_id: pipelineVersionId }),
  );
};
