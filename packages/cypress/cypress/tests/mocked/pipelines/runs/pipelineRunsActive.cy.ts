/* eslint-disable camelcase */
import {
  PluginStateKF,
  RuntimeStateKF,
  runtimeStateLabels,
} from '@odh-dashboard/internal/concepts/pipelines/kfTypes';
import { DSPAMlflowIntegrationMode } from '@odh-dashboard/k8s-core';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { buildMockRunKF } from '@odh-dashboard/internal/__mocks__';
import {
  projectName,
  pipelineId,
  mockActiveRuns,
  mockExperiments,
  initIntercepts,
} from './pipelineRunsTestUtils';
import {
  activeRunsTable,
  pipelineRunsGlobal,
  pipelineRunFilterBar,
  archivedRunsTable,
  archiveRunModal,
  bulkArchiveRunModal,
  duplicateRunPage,
} from '../../../../pages/pipelines';
import { verifyRelativeURL } from '../../../../utils/url';
import { be } from '../../../../utils/should';
import { tablePagination } from '../../../../pages/components/Pagination';
import {
  interceptDSPAMlflowIntegration,
  interceptMlflowStatus,
} from '../../../../utils/mlflowUtils';

describe('Pipeline runs - Active runs', () => {
  beforeEach(() => {
    initIntercepts();
  });

  describe('Active runs', () => {
    describe('empty state', () => {
      beforeEach(() => {
        activeRunsTable.mockGetActiveRuns([], projectName);
        pipelineRunsGlobal.visit(projectName, 'active');
      });

      // CONVERTED to Jest: PipelineRunTable.spec.tsx

      it('navigate to create run page', () => {
        pipelineRunsGlobal.findCreateRunButton().click();
        verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/runs/create`);
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

        pipelineRunsGlobal.visit(projectName, 'active');

        cy.wait('@getActiveRuns').then((interception) => {
          expect(interception.request.query).to.eql({
            sort_by: 'created_at desc',
            page_size: '10',
            filter: encodeURIComponent(
              '{"predicates":[{"key":"storage_state","operation":"EQUALS","string_value":"AVAILABLE"}]}',
            ),
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
            filter: encodeURIComponent(
              '{"predicates":[{"key":"storage_state","operation":"EQUALS","string_value":"AVAILABLE"}]}',
            ),
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

      // CONVERTED to Jest: PipelineRunTable.spec.tsx

      it('archive a single run', () => {
        pipelineRunsGlobal.visit(projectName, 'active');
        const [runToArchive] = mockActiveRuns;

        activeRunsTable.mockArchiveRun(runToArchive.run_id, projectName);
        activeRunsTable.getRowByName(runToArchive.display_name).findKebabAction('Archive').click();

        activeRunsTable.mockGetRuns([mockActiveRuns[1]], [runToArchive], projectName);
        archiveRunModal.findConfirmInput().type(runToArchive.display_name);
        archiveRunModal.findSubmitButton().click();
        activeRunsTable.shouldRowNotExist(runToArchive.display_name);

        pipelineRunsGlobal.findArchivedRunsTab().click();
        archivedRunsTable.getRowByName(runToArchive.display_name).find().should('exist');
      });

      it('archive multiple runs', () => {
        pipelineRunsGlobal.visit(projectName, 'active');
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
          pipelineRunsGlobal.visit(projectName, 'active');
          pipelineRunsGlobal.findCreateRunButton().click();
          verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/runs/create`);
        });

        it('navigate to duplicate run page', () => {
          duplicateRunPage.mockGetExperiments(projectName, mockExperiments);
          duplicateRunPage.mockGetExperiment(projectName, mockExperiments[0]);
          cy.visitWithLogin(`/develop-train/experiments/${projectName}/test-experiment-1/runs`);

          activeRunsTable
            .getRowByName(mockActiveRuns[0].display_name)
            .findKebabAction('Duplicate')
            .click();

          verifyRelativeURL(
            `/develop-train/pipelines/runs/${projectName}/runs/duplicate/${mockActiveRuns[0].run_id}`,
          );
        });

        it('navigate between tabs', () => {
          pipelineRunsGlobal.visit(projectName, 'active');
          pipelineRunsGlobal.findArchivedRunsTab().click();
          verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/runs/archived`);
          pipelineRunsGlobal.findActiveRunsTab().click();
          verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/runs/active`);
          pipelineRunsGlobal.findSchedulesTab().click();
          verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/schedules`);
        });

        it('navigate to run details page', () => {
          pipelineRunsGlobal.visit(projectName, 'active');
          activeRunsTable
            .getRowByName(mockActiveRuns[0].display_name)
            .findColumnName(mockActiveRuns[0].display_name)
            .click();

          verifyRelativeURL(
            `/develop-train/pipelines/runs/${projectName}/runs/${mockActiveRuns[0].run_id}`,
          );
        });

        it('compare runs button navigates to MLflow when dev flag is enabled', () => {
          cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
          interceptMlflowStatus();
          interceptDSPAMlflowIntegration(projectName);
          pipelineRunsGlobal.visit(projectName, 'active');
          cy.wait('@mlflowStatus');

          activeRunsTable.getRowByName(mockActiveRuns[0].display_name).findCheckbox().click();
          activeRunsTable.getRowByName(mockActiveRuns[1].display_name).findCheckbox().click();

          pipelineRunsGlobal.findCompareRunsButton().click();

          const params = new URLSearchParams();
          params.set('runs', JSON.stringify(['mlflow-run-aaa', 'mlflow-run-bbb']));
          params.set('experiments', JSON.stringify(['6', '14']));
          params.set('workspace', projectName);
          verifyRelativeURL(`/develop-train/mlflow/experiments/compare-runs?${params.toString()}`);
        });

        it('compare runs button navigates to KFP when MLflow dev flag is disabled', () => {
          interceptMlflowStatus(false);
          interceptDSPAMlflowIntegration(projectName, DSPAMlflowIntegrationMode.DISABLED);
          cy.interceptOdh(
            'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
            {
              path: {
                namespace: projectName,
                serviceName: 'dspa',
                runId: mockActiveRuns[0].run_id,
              },
            },
            mockActiveRuns[0],
          );
          cy.interceptOdh(
            'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
            {
              path: {
                namespace: projectName,
                serviceName: 'dspa',
                runId: mockActiveRuns[1].run_id,
              },
            },
            mockActiveRuns[1],
          );
          pipelineRunsGlobal.visit(projectName, 'active');
          cy.wait('@mlflowStatus');

          activeRunsTable.getRowByName(mockActiveRuns[0].display_name).findCheckbox().click();
          activeRunsTable.getRowByName(mockActiveRuns[1].display_name).findCheckbox().click();

          pipelineRunsGlobal.findCompareRunsButton().should('not.be.disabled');
          pipelineRunsGlobal.findCompareRunsButton().click();

          verifyRelativeURL(
            `/develop-train/pipelines/runs/${projectName}/compare-runs?compareRuns=${mockActiveRuns[0].run_id},${mockActiveRuns[1].run_id}`,
          );
        });

        it('compare runs falls back to KFP for mixed MLflow metadata when MLflow is enabled', () => {
          cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
          interceptMlflowStatus();
          interceptDSPAMlflowIntegration(projectName);
          const runWithoutMlflow = buildMockRunKF({
            display_name: 'Run without mlflow',
            run_id: 'run-no-mlflow',
            experiment_id: 'test-experiment-1',
            state: RuntimeStateKF.SUCCEEDED,
          });
          cy.interceptOdh(
            'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
            {
              path: {
                namespace: projectName,
                serviceName: 'dspa',
                runId: mockActiveRuns[0].run_id,
              },
            },
            mockActiveRuns[0],
          );
          cy.interceptOdh(
            'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
            {
              path: {
                namespace: projectName,
                serviceName: 'dspa',
                runId: runWithoutMlflow.run_id,
              },
            },
            runWithoutMlflow,
          );
          activeRunsTable.mockGetActiveRuns([mockActiveRuns[0], runWithoutMlflow], projectName);
          pipelineRunsGlobal.visit(projectName, 'active');
          cy.wait('@mlflowStatus');

          activeRunsTable.getRowByName(mockActiveRuns[0].display_name).findCheckbox().click();
          activeRunsTable.getRowByName(runWithoutMlflow.display_name).findCheckbox().click();

          pipelineRunsGlobal
            .findCompareRunsButton()
            .should('have.attr', 'href')
            .and('include', `compareRuns=${mockActiveRuns[0].run_id},${runWithoutMlflow.run_id}`);
          pipelineRunsGlobal.findCompareRunsButton().click();

          verifyRelativeURL(
            `/develop-train/pipelines/runs/${projectName}/compare-runs?compareRuns=${mockActiveRuns[0].run_id},${runWithoutMlflow.run_id}`,
          );
        });

        it('per-row kebab Compare runs navigates to MLflow when MLflow metadata is present', () => {
          cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
          interceptMlflowStatus();
          interceptDSPAMlflowIntegration(projectName);
          pipelineRunsGlobal.visit(projectName, 'active');
          cy.wait('@mlflowStatus');

          activeRunsTable
            .getRowByName(mockActiveRuns[0].display_name)
            .findKebabAction('Compare runs')
            .click();

          verifyRelativeURL(
            `/develop-train/mlflow/experiments/compare-runs?runs=%5B%22mlflow-run-aaa%22%5D&experiments=%5B%226%22%5D&workspace=${projectName}`,
          );
        });

        it('per-row kebab Compare runs falls back to KFP when MLflow metadata is absent', () => {
          interceptMlflowStatus(false);
          interceptDSPAMlflowIntegration(projectName, DSPAMlflowIntegrationMode.DISABLED);
          const runWithoutMlflow = buildMockRunKF({
            display_name: 'Run without mlflow kebab',
            run_id: 'run-no-mlflow-kebab',
            pipeline_version_reference: {
              pipeline_id: pipelineId,
              pipeline_version_id: 'test-version-1',
            },
            experiment_id: 'test-experiment-1',
            state: RuntimeStateKF.SUCCEEDED,
          });
          cy.interceptOdh(
            'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
            {
              path: {
                namespace: projectName,
                serviceName: 'dspa',
                runId: runWithoutMlflow.run_id,
              },
            },
            runWithoutMlflow,
          );
          activeRunsTable.mockGetActiveRuns([runWithoutMlflow], projectName);
          pipelineRunsGlobal.visit(projectName, 'active');

          activeRunsTable
            .getRowByName(runWithoutMlflow.display_name)
            .findKebabAction('Compare runs')
            .click();

          verifyRelativeURL(
            `/develop-train/pipelines/runs/${projectName}/compare-runs?compareRuns=${runWithoutMlflow.run_id}`,
          );
        });

        it('navigate to MLflow experiment details from active run row', () => {
          cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
          interceptMlflowStatus();
          interceptDSPAMlflowIntegration(projectName);
          cy.intercept('GET', '/_bff/mlflow/api/v1/experiments*', (req) => {
            expect(req.query.workspace).to.equal(projectName);
            req.reply({ data: { experiments: [] } });
          });
          const runWithMlflow = buildMockRunKF({
            display_name: 'Run with mlflow',
            run_id: 'run-with-mlflow',
            plugins_output: {
              mlflow: {
                entries: {
                  experiment_name: { value: 'MLflow experiment 1' },
                  experiment_id: { value: 'mlflow-exp-1' },
                },
                state: PluginStateKF.PLUGIN_SUCCEEDED,
              },
            },
          });
          activeRunsTable.mockGetActiveRuns([runWithMlflow], projectName);

          pipelineRunsGlobal.visit(projectName, 'active');
          activeRunsTable
            .findMlflowExperimentLink(runWithMlflow.display_name)
            .should('have.attr', 'href')
            .and('include', '/develop-train/mlflow/experiments/mlflow-exp-1')
            .and('include', `workspace=${projectName}`);
        });
      });

      // CONVERTED to Jest: PipelineRunTable.spec.tsx

      describe('Table filter', () => {
        it('filter by name', () => {
          pipelineRunsGlobal.visit(projectName, 'active');

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
          );

          // Verify only rows with the typed run name exist
          activeRunsTable.findRows().should('have.length', 1);
          activeRunsTable.getRowByName('Test active run 1').find().should('exist');
        });

        it('filter by run group', () => {
          pipelineRunsGlobal.visit(projectName, 'active');

          // Mock initial list of experiments
          pipelineRunFilterBar.mockExperiments(mockExperiments, projectName);

          // Verify initial run rows exist
          activeRunsTable.findRows().should('have.length', 3);

          // Select the "Run group" filter, enter a value to filter by
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunsGlobal.selectFilterByName('Run group'));

          // Mock runs (filtered by selected experiment)
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.experiment_id === 'test-experiment-1'),
            projectName,
          );

          // Select an experiment to filter by
          pipelineRunFilterBar.selectRunGroupByName('Test Experiment 1');

          // Verify only rows with selected experiment exist
          activeRunsTable.findRows().should('have.length', 2);
          activeRunsTable.getRowByName('Test active run 1').find().should('exist');
          activeRunsTable.getRowByName('Test active run 3').find().should('exist');
        });

        it('filter by MLflow experiment', () => {
          cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
          interceptMlflowStatus();
          const runsWithMlflow = [
            buildMockRunKF({
              display_name: 'Run with mlflow first',
              run_id: 'run-mlflow-first',
              experiment_id: 'test-experiment-1',
              plugins_input: {
                mlflow: { experiment_name: 'unique-target' },
              },
            }),
            buildMockRunKF({
              display_name: 'Run with mlflow second',
              run_id: 'run-mlflow-second',
              experiment_id: 'test-experiment-1',
              plugins_input: {
                mlflow: { experiment_name: 'other-exp' },
              },
            }),
            buildMockRunKF({
              display_name: 'Run without mlflow',
              run_id: 'run-no-mlflow',
              experiment_id: 'test-experiment-1',
            }),
          ];
          activeRunsTable.mockGetActiveRuns(runsWithMlflow, projectName);

          cy.visitWithLogin(
            `/develop-train/pipelines/runs/${projectName}/runs/active?mlflow_experiment=unique-target`,
          );
          cy.findByTestId('app-page-title').contains('Runs');

          activeRunsTable.findRows().should('have.length', 1);
          activeRunsTable.getRowByName('Run with mlflow first').find().should('exist');
        });

        it('filter by created after', () => {
          pipelineRunsGlobal.visit(projectName, 'active');

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
          );
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() => pipelineRunFilterBar.findStartDateInput().type('2024-02-15'));

          // Verify no results were found
          activeRunsTable.findEmptyResults().should('exist');
        });

        it('filter by status', () => {
          pipelineRunsGlobal.visit(projectName, 'active');

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

          // Mock runs (filtered by a status of 'PENDING')
          activeRunsTable.mockGetActiveRuns(
            mockActiveRuns.filter((mockRun) => mockRun.state === RuntimeStateKF.PENDING),
            projectName,
          );
          // Select a filter value of 'PENDING'
          pipelineRunsGlobal
            .findActiveRunsToolbar()
            .within(() =>
              pipelineRunFilterBar.selectStatusByName(runtimeStateLabels[RuntimeStateKF.PENDING]),
            );

          // Verify only rows with the selected status exist
          activeRunsTable.findRows().should('have.length', 1);
          activeRunsTable.getRowByName('Test active run 3').find().should('exist');

          // Verify no "Canceled" and "Paused" status filter
          pipelineRunsGlobal.findActiveRunsToolbar().within(() => {
            pipelineRunFilterBar.findStatusSelect().click();
          });
          cy.findByTestId(runtimeStateLabels[RuntimeStateKF.SKIPPED]).should('exist');
          cy.findByTestId(runtimeStateLabels[RuntimeStateKF.PAUSED]).should('not.exist');
          cy.findByTestId(runtimeStateLabels[RuntimeStateKF.CANCELED]).should('not.exist');
        });

        it('Sort by Name', () => {
          pipelineRunsGlobal.visit(projectName, 'active');

          pipelineRunFilterBar.findSortButtonForActive('Run').click();
          pipelineRunFilterBar.findSortButtonForActive('Run').should(be.sortAscending);
          pipelineRunFilterBar.findSortButtonForActive('Run').click();
          pipelineRunFilterBar.findSortButtonForActive('Run').should(be.sortDescending);
        });
      });

      describe('Labels', () => {
        it('shows model registered label when fine tuning and model registry is enabled', () => {
          pipelineRunsGlobal.visit(projectName, 'active');
          activeRunsTable
            .findModelRegisteredLabel('Test active run 1')
            .should('have.text', 'Model registered');
        });
      });
    });
  });
});
