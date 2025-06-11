/* eslint-disable camelcase */
import { mockDataSciencePipelineApplicationK8sResource } from '#~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '#~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { buildMockRunKF } from '#~/__mocks__/mockRunKF';
import {
  pipelineRecurringRunTable,
  pipelineRunsGlobal,
  archivedRunsTable,
  runsDeleteModal,
  schedulesDeleteModal,
} from '#~/__tests__/cypress/cypress/pages/pipelines';
import {
  DataSciencePipelineApplicationModel,
  NotebookModel,
  ProjectModel,
  RouteModel,
  SecretModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { mockSuccessGoogleRpcStatus } from '#~/__mocks__/mockGoogleRpcStatusKF';
import {
  buildMockPipeline,
  buildMockPipelines,
  buildMockPipelineVersion,
  buildMockPipelineVersions,
  buildMockRecurringRunKF,
} from '#~/__mocks__';

const initIntercepts = () => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: { 'data-science-pipelines-operator': true },
    }),
  );

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns',
    {
      path: { namespace: 'test-project', serviceName: 'dspa' },
    },
    {
      recurringRuns: [
        buildMockRecurringRunKF({
          display_name: 'test-pipeline',
          recurring_run_id: 'test-pipeline',
        }),
        buildMockRecurringRunKF({
          display_name: 'other-pipeline',
          recurring_run_id: 'other-pipeline',
        }),
      ],
    },
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs',
    {
      path: { namespace: 'test-project', serviceName: 'dspa' },
    },
    {
      runs: [
        buildMockRunKF({ display_name: 'test-pipeline', run_id: 'test-pipeline' }),
        buildMockRunKF({ display_name: 'other-pipeline', run_id: 'other-pipeline' }),
      ],
    },
  );

  cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'ds-pipeline-dspa' }));
  cy.interceptK8s(SecretModel, mockSecretK8sResource({ name: 'ds-pipeline-config' }));
  cy.interceptK8s(SecretModel, mockSecretK8sResource({ name: 'pipelines-db-password' }));
  cy.interceptK8s(SecretModel, mockSecretK8sResource({ name: 'aws-connection-testdb' }));
  cy.interceptK8sList(
    DataSciencePipelineApplicationModel,
    mockK8sResourceList([mockDataSciencePipelineApplicationK8sResource({})]),
  );
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({}),
  );
  cy.interceptK8sList(NotebookModel, mockK8sResourceList([mockNotebookK8sResource({})]));
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
    {
      path: {
        namespace: 'test-project',
        serviceName: 'dspa',
      },
    },
    buildMockPipelines([
      buildMockPipeline({
        pipeline_id: 'pipeline-id',
      }),
    ]),
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
    {
      path: {
        namespace: 'test-project',
        serviceName: 'dspa',
        pipelineId: 'pipeline_id',
      },
    },
    buildMockPipelineVersions([
      buildMockPipelineVersion({
        pipeline_id: 'pipeline_id',
        pipeline_version_id: 'version_id',
      }),
    ]),
  );
};

describe('Test deleting runs', () => {
  beforeEach(() => {
    initIntercepts();
    pipelineRunsGlobal.visit('test-project');
    pipelineRunsGlobal.isApiAvailable();
  });

  it('Test delete a single schedule', () => {
    pipelineRunsGlobal.findSchedulesTab().click();
    pipelineRecurringRunTable.getRowByName('test-pipeline').findKebabAction('Delete').click();

    schedulesDeleteModal.shouldBeOpen();
    schedulesDeleteModal.findSubmitButton().should('be.disabled');
    schedulesDeleteModal.findInput().type('test-pipeline');
    schedulesDeleteModal.findSubmitButton().should('be.enabled');
    cy.interceptOdh(
      'DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId',
      {
        path: { namespace: 'test-project', serviceName: 'dspa', recurringRunId: 'test-pipeline' },
      },
      mockSuccessGoogleRpcStatus({}),
    ).as('deleteRecurringRunPipeline');

    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns',
      {
        path: { namespace: 'test-project', serviceName: 'dspa' },
      },
      {
        recurringRuns: [
          buildMockRecurringRunKF({
            recurring_run_id: 'other-pipeline',
            display_name: 'other-pipeline',
          }),
        ],
      },
    ).as('getRuns');

    schedulesDeleteModal.findSubmitButton().click();

    cy.wait('@deleteRecurringRunPipeline');

    cy.wait('@getRuns').then((interception) => {
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '10',
        filter: encodeURIComponent('{"predicates":[]}'),
      });

      pipelineRecurringRunTable.findEmptyState().should('not.exist');
    });
  });

  it('Test delete multiple schedules', () => {
    pipelineRunsGlobal.findSchedulesTab().click();
    pipelineRecurringRunTable.getRowByName('test-pipeline').findCheckbox().click();
    pipelineRecurringRunTable.getRowByName('other-pipeline').findCheckbox().click();

    pipelineRecurringRunTable.findActionsKebab().findDropdownItem('Delete').click();

    schedulesDeleteModal.shouldBeOpen();
    schedulesDeleteModal.findSubmitButton().should('be.disabled');
    schedulesDeleteModal.findInput().type('Delete 2 schedules');
    schedulesDeleteModal.findSubmitButton().should('be.enabled');
    cy.interceptOdh(
      'DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId',
      {
        path: { namespace: 'test-project', serviceName: 'dspa', recurringRunId: 'test-pipeline' },
      },
      mockSuccessGoogleRpcStatus({}),
    ).as('deleteRecurringRunPipeline-1');

    cy.interceptOdh(
      'DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId',
      {
        path: {
          namespace: 'test-project',
          serviceName: 'dspa',
          recurringRunId: 'other-pipeline',
        },
      },
      mockSuccessGoogleRpcStatus({}),
    ).as('deleteRecurringRunPipeline-2');

    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns',
      {
        path: { namespace: 'test-project', serviceName: 'dspa' },
      },
      { recurringRuns: [] },
    ).as('getRuns');

    schedulesDeleteModal.findSubmitButton().click();

    cy.wait('@deleteRecurringRunPipeline-1');
    cy.wait('@deleteRecurringRunPipeline-2');

    cy.wait('@getRuns').then((interception) => {
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '10',
        filter: encodeURIComponent('{"predicates":[]}'),
      });
    });
    pipelineRecurringRunTable.findEmptyState().should('exist');
  });

  it('Test delete a single archived run', () => {
    pipelineRunsGlobal.findArchivedRunsTab().click();
    archivedRunsTable.getRowByName('test-pipeline').findKebabAction('Delete').click();

    runsDeleteModal.shouldBeOpen();
    runsDeleteModal.findSubmitButton().should('be.disabled');
    runsDeleteModal.findInput().type('test-pipeline');
    runsDeleteModal.findSubmitButton().should('be.enabled');

    cy.interceptOdh(
      'DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
      {
        path: { namespace: 'test-project', serviceName: 'dspa', runId: 'test-pipeline' },
      },
      mockSuccessGoogleRpcStatus({}),
    ).as('deleteRunPipeline');

    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs',
      {
        path: { namespace: 'test-project', serviceName: 'dspa' },
      },
      { runs: [buildMockRunKF({ run_id: 'other-pipeline', display_name: 'other-pipeline' })] },
    ).as('getRuns');

    runsDeleteModal.findSubmitButton().click();

    cy.wait('@deleteRunPipeline');

    cy.wait('@getRuns').then((interception) => {
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '10',
        filter: encodeURIComponent(
          '{"predicates":[{"key":"storage_state","operation":"EQUALS","string_value":"ARCHIVED"}]}',
        ),
      });
    });
    archivedRunsTable.findEmptyState().should('not.exist');
  });

  it('Test delete multiple archived runs', () => {
    pipelineRunsGlobal.findArchivedRunsTab().click();
    archivedRunsTable.getRowByName('test-pipeline').findCheckbox().click();
    archivedRunsTable.getRowByName('other-pipeline').findCheckbox().click();

    archivedRunsTable.findActionsKebab().findDropdownItem('Delete').click();

    runsDeleteModal.shouldBeOpen();
    runsDeleteModal.findSubmitButton().should('be.disabled');
    runsDeleteModal.findInput().type('Delete 2 runs');
    runsDeleteModal.findSubmitButton().should('be.enabled');
    cy.interceptOdh(
      'DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
      {
        path: { namespace: 'test-project', serviceName: 'dspa', runId: 'test-pipeline' },
      },
      mockSuccessGoogleRpcStatus({}),
    ).as('deleteRunPipeline-1');

    cy.interceptOdh(
      'DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
      {
        path: { namespace: 'test-project', serviceName: 'dspa', runId: 'other-pipeline' },
      },
      mockSuccessGoogleRpcStatus({}),
    ).as('deleteRunPipeline-2');
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs',
      {
        path: { namespace: 'test-project', serviceName: 'dspa' },
      },
      { runs: [] },
    ).as('getRuns');

    runsDeleteModal.findSubmitButton().click();

    cy.wait('@deleteRunPipeline-1');

    cy.wait('@deleteRunPipeline-2');

    cy.wait('@getRuns').then((interception) => {
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '10',
        filter: encodeURIComponent(
          '{"predicates":[{"key":"storage_state","operation":"EQUALS","string_value":"ARCHIVED"}]}',
        ),
      });
    });
    archivedRunsTable.findEmptyState().should('exist');
  });
});
