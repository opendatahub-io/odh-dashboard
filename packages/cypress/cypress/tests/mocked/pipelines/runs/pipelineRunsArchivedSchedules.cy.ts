/* eslint-disable camelcase */
import {
  RuntimeStateKF,
  runtimeStateLabels,
} from '@odh-dashboard/internal/concepts/pipelines/kfTypes';
import { buildMockRecurringRunKF } from '@odh-dashboard/internal/__mocks__';
import {
  projectName,
  pipelineId,
  mockArchivedRuns,
  mockArchivedRunsWithArchivedExperiments,
  mockExperiments,
  mockRecurringRuns,
  initIntercepts,
} from './pipelineRunsTestUtils';
import {
  activeRunsTable,
  pipelineRunsGlobal,
  pipelineRunFilterBar,
  pipelineRecurringRunTable,
  archivedRunsTable,
  restoreRunModal,
  bulkRestoreRunModal,
  duplicateSchedulePage,
  bulkRestoreRunWithArchivedExperimentModal,
  restoreRunWithArchivedExperimentModal,
} from '../../../../pages/pipelines';
import { verifyRelativeURL } from '../../../../utils/url';
import { be } from '../../../../utils/should';
import { tablePagination } from '../../../../pages/components/Pagination';

describe('Pipeline runs - Archived runs and Schedules', () => {
  beforeEach(() => {
    initIntercepts();
  });

  describe('Archived runs', () => {
    // CONVERTED to Jest: PipelineRunTable.spec.tsx

    describe('with data', () => {
      beforeEach(() => {
        archivedRunsTable.mockGetArchivedRuns(mockArchivedRuns, projectName);
        pipelineRunsGlobal.visit(projectName, 'archived');
      });

      // CONVERTED to Jest: PipelineRunTable.spec.tsx

      it('restore a single run', () => {
        const [runToRestore] = mockArchivedRuns;

        archivedRunsTable.mockRestoreRun(runToRestore.run_id, projectName);
        archivedRunsTable
          .getRowByName(runToRestore.display_name)
          .findKebabAction('Restore')
          .click();

        archivedRunsTable.mockGetRuns([runToRestore], [mockArchivedRuns[1]], projectName);
        restoreRunModal.findSubmitButton().click();
        archivedRunsTable.shouldRowNotExist(runToRestore.display_name);

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
          );

          // Verify only rows with the typed run name exist
          archivedRunsTable.findRows().should('have.length', 1);
          archivedRunsTable.getRowByName('Test archived run 1').find().should('exist');
        });

        it('filter by run group', () => {
          // Mock initial list of experiments
          pipelineRunFilterBar.mockExperiments(mockExperiments, projectName);

          // Verify initial run rows exist
          archivedRunsTable.findRows().should('have.length', 2);

          // Select the "Run group" filter, enter a value to filter by
          pipelineRunsGlobal
            .findArchivedRunsToolbar()
            .within(() => pipelineRunsGlobal.selectFilterByName('Run group'));

          // Mock runs (filtered by selected experiment)
          archivedRunsTable.mockGetArchivedRuns(
            mockArchivedRuns.filter((mockRun) => mockRun.experiment_id === 'test-experiment-1'),
            projectName,
          );

          // Select an experiment to filter by
          pipelineRunFilterBar.selectRunGroupByName('Test Experiment 1');

          // Verify only rows with selected experiment exist
          archivedRunsTable.findRows().should('have.length', 1);
          archivedRunsTable.getRowByName('Test archived run 1').find().should('exist');
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

    it('restore multiple runs with archived experiments', () => {
      archivedRunsTable.mockGetArchivedRuns(
        [...mockArchivedRuns, ...mockArchivedRunsWithArchivedExperiments],
        projectName,
      );
      pipelineRunsGlobal.visit(projectName, 'archived');
      [...mockArchivedRuns, ...mockArchivedRunsWithArchivedExperiments].forEach((archivedRun) => {
        archivedRunsTable.mockRestoreRun(archivedRun.run_id, projectName);
        if (archivedRun.experiment_id === 'test-experiment-2') {
          archivedRunsTable.mockRestoreExperiment(archivedRun.experiment_id, projectName);
        }
        archivedRunsTable.getRowByName(archivedRun.display_name).findCheckbox().click();
      });
      pipelineRunsGlobal.findRestoreRunButton().click();
      archivedRunsTable.mockGetRuns(
        [...mockArchivedRuns, ...mockArchivedRunsWithArchivedExperiments],
        [],
        projectName,
      );
      bulkRestoreRunWithArchivedExperimentModal.findSubmitButton().click();
      archivedRunsTable.findEmptyState().should('exist');
    });

    it('handle error when restore multiple runs with archived experiments fails', () => {
      archivedRunsTable.mockGetArchivedRuns(
        [...mockArchivedRuns, ...mockArchivedRunsWithArchivedExperiments],
        projectName,
      );
      pipelineRunsGlobal.visit(projectName, 'archived');
      [...mockArchivedRuns, ...mockArchivedRunsWithArchivedExperiments].forEach((archivedRun) => {
        archivedRunsTable.mockRestoreRunFails(archivedRun.run_id, projectName);
        if (archivedRun.experiment_id === 'test-experiment-2') {
          archivedRunsTable.mockRestoreExperiment(archivedRun.experiment_id, projectName);
        }
        archivedRunsTable.getRowByName(archivedRun.display_name).findCheckbox().click();
      });
      pipelineRunsGlobal.findRestoreRunButton().click();
      archivedRunsTable.mockGetRuns(
        [...mockArchivedRuns, ...mockArchivedRunsWithArchivedExperiments],
        [],
        projectName,
      );
      bulkRestoreRunWithArchivedExperimentModal.findSubmitButton().click();
      bulkRestoreRunWithArchivedExperimentModal.findErrorMessage().should('exist');

      [...mockArchivedRuns, ...mockArchivedRunsWithArchivedExperiments].forEach((archivedRun) => {
        archivedRunsTable.mockRestoreRun(archivedRun.run_id, projectName);
      });
      //retry
      bulkRestoreRunWithArchivedExperimentModal.findRetryButton().click();
      archivedRunsTable.findEmptyState().should('exist');
    });

    it('restore a single run', () => {
      archivedRunsTable.mockGetArchivedRuns(
        [...mockArchivedRuns, ...mockArchivedRunsWithArchivedExperiments],
        projectName,
      );
      pipelineRunsGlobal.visit(projectName, 'archived');
      const [, runToRestore] = mockArchivedRunsWithArchivedExperiments;

      archivedRunsTable.mockRestoreRun(runToRestore.run_id, projectName);
      archivedRunsTable.getRowByName(runToRestore.display_name).findKebabAction('Restore').click();

      const allArchived = [...mockArchivedRuns, ...mockArchivedRunsWithArchivedExperiments];
      const remainingArchived = allArchived.filter((r) => r.run_id !== runToRestore.run_id);
      archivedRunsTable.mockGetRuns([runToRestore], remainingArchived, projectName);
      restoreRunWithArchivedExperimentModal.findAlertMessage().should('exist');
      restoreRunWithArchivedExperimentModal.findSubmitButton().click();
      archivedRunsTable.shouldRowNotExist(runToRestore.display_name);
    });
  });

  describe('Schedules', () => {
    describe('empty state', () => {
      beforeEach(() => {
        pipelineRecurringRunTable.mockGetRecurringRuns([], projectName);
        pipelineRunsGlobal.visit(projectName, 'scheduled');
      });

      // CONVERTED to Jest: PipelineRecurringRunTable.spec.tsx

      it('navigate to create schedule page', () => {
        pipelineRunsGlobal.findScheduleRunButton().click();
        verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/schedules/create`);
      });
    });

    // CONVERTED to Jest: PipelineRecurringRunTable.spec.tsx

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
        pipelineRunsGlobal.visit(projectName, 'scheduled');

        cy.wait('@getScheduledRuns').then((interception) => {
          expect(interception.request.query).to.eql({
            sort_by: 'created_at desc',
            page_size: '10',
          });
        });

        pipelineRecurringRunTable.getRowByName('another-pipeline-0').find().should('exist');
        pipelineRecurringRunTable.findRows().should('have.length', 10);

        const pagination = tablePagination.top;

        // test Next button
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
            sort_by: 'created_at desc',
            page_size: '10',
            page_token: 'page-2-token',
          });
        });

        pipelineRecurringRunTable.getRowByName('another-pipeline-14').find().should('exist');
        pipelineRecurringRunTable.findRows().should('have.length', 5);

        //test first button
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
        pagination.findPreviousButton().click();
        pipelineRecurringRunTable.getRowByName('another-pipeline-0').find().should('exist');
        pipelineRecurringRunTable.findRows().should('have.length', 10);

        //test last button
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

        pagination.findNextButton().click();
        pipelineRecurringRunTable.getRowByName('another-pipeline-14').find().should('exist');
        pipelineRecurringRunTable.findRows().should('have.length', 5);

        cy.wait('@refreshPipelineRecurringRuns').then((interception) => {
          expect(interception.request.query).to.eql({
            sort_by: 'created_at desc',
            page_size: '10',
            page_token: 'new-page-token',
          });
        });

        // test Previous button
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
        pagination.findNextButton().should('be.disabled');
        pagination.findPreviousButton().should('be.disabled');
      });
    });

    describe('with data', () => {
      beforeEach(() => {
        pipelineRecurringRunTable.mockGetRecurringRuns(mockRecurringRuns, projectName);
      });

      // CONVERTED to Jest: PipelineRecurringRunTable.spec.tsx

      it('can disable a recurring run', () => {
        pipelineRunsGlobal.visit(projectName, 'scheduled');
        pipelineRecurringRunTable
          .mockDisableRecurringRun(mockRecurringRuns[0], projectName)
          .as('disableRecurringRun');
        pipelineRecurringRunTable
          .getRowByName(mockRecurringRuns[0].display_name)
          .findStatusSwitchByRowName()
          .click();
        cy.wait('@disableRecurringRun', { timeout: 10000 });
      });

      // CONVERTED to Jest: PipelineRecurringRunTable.spec.tsx

      describe('Navigation', () => {
        it('navigate to create scheduled run page', () => {
          pipelineRunsGlobal.visit(projectName, 'scheduled');
          pipelineRunsGlobal.findScheduleRunButton().click();
          verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/schedules/create`);
        });

        it('navigate to duplicate scheduled run page', () => {
          duplicateSchedulePage.mockGetExperiments(projectName, mockExperiments);
          duplicateSchedulePage.mockGetExperiment(projectName, mockExperiments[0]);
          cy.visitWithLogin(`/develop-train/experiments/${projectName}/test-experiment-1/runs`);

          pipelineRunsGlobal.findSchedulesTab().click();
          pipelineRecurringRunTable
            .getRowByName(mockRecurringRuns[0].display_name)
            .findKebabAction('Duplicate')
            .click();

          verifyRelativeURL(
            `/develop-train/pipelines/runs/${projectName}/schedules/duplicate/${mockRecurringRuns[0].recurring_run_id}`,
          );
        });

        it('navigate to scheduled run details page', () => {
          pipelineRunsGlobal.visit(projectName, 'scheduled');
          pipelineRunsGlobal.findSchedulesTab().click();
          pipelineRecurringRunTable
            .getRowByName(mockRecurringRuns[0].display_name)
            .findColumnName(mockRecurringRuns[0].display_name)
            .click();
          verifyRelativeURL(
            `/develop-train/pipelines/runs/${projectName}/schedules/${mockRecurringRuns[0].recurring_run_id}`,
          );
        });
      });

      // CONVERTED to Jest: PipelineRecurringRunTable.spec.tsx

      describe('Table filter', () => {
        it('filter by name', () => {
          pipelineRunsGlobal.visit(projectName, 'scheduled');
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
          pipelineRunsGlobal.visit(projectName, 'scheduled');
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
