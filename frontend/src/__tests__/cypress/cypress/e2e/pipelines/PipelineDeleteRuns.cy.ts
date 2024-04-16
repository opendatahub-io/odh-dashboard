/* eslint-disable camelcase */
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import { mockPipelineKFv2 } from '~/__mocks__/mockPipelineKF';
import { buildMockJobKF } from '~/__mocks__/mockJobKF';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { buildMockRunKF } from '~/__mocks__/mockRunKF';
import {
  pipelineRunJobTable,
  pipelineRunsGlobal,
  archivedRunsTable,
  runsDeleteModal,
  schedulesDeleteModal,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import {
  DataSciencePipelineApplicationModel,
  NotebookModel,
  ProjectModel,
  RouteModel,
  SecretModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { mock200Status } from '~/__mocks__/mockK8sStatus';

const initIntercepts = () => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: { 'data-science-pipelines-operator': true },
    }),
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/service/pipelines/test-project/dspa/apis/v2beta1/pipelines/test-pipeline',
    },
    mockPipelineKFv2({}),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/service/pipelines/test-project/dspa/apis/v2beta1/recurringruns',
    },
    {
      recurringRuns: [
        buildMockJobKF({ display_name: 'test-pipeline', recurring_run_id: 'test-pipeline' }),
        buildMockJobKF({ display_name: 'other-pipeline', recurring_run_id: 'other-pipeline' }),
      ],
    },
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/service/pipelines/test-project/dspa/apis/v2beta1/runs',
    },
    {
      runs: [
        buildMockRunKF({ display_name: 'test-pipeline', run_id: 'test-pipeline' }),
        buildMockRunKF({ display_name: 'other-pipeline', run_id: 'other-pipeline' }),
      ],
    },
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/service/pipelines/test-project/dspa/apis/v2beta1/pipelines',
    },
    mockPipelineKFv2({}),
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
};

describe('Pipeline runs', () => {
  describe('Test deleting runs', () => {
    it('Test delete a single schedule', () => {
      initIntercepts();

      pipelineRunsGlobal.visit('test-project');
      pipelineRunsGlobal.isApiAvailable();

      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunJobTable.getRowByName('test-pipeline').findKebabAction('Delete').click();

      schedulesDeleteModal.shouldBeOpen();
      schedulesDeleteModal.findSubmitButton().should('be.disabled');
      schedulesDeleteModal.findInput().type('test-pipeline');
      schedulesDeleteModal.findSubmitButton().should('be.enabled');

      cy.intercept(
        {
          method: 'DELETE',
          pathname:
            '/api/service/pipelines/test-project/dspa/apis/v2beta1/recurringruns/test-pipeline',
        },
        mock200Status({}),
      ).as('deleteJobPipeline');

      cy.intercept(
        {
          method: 'GET',
          pathname: '/api/service/pipelines/test-project/dspa/apis/v2beta1/recurringruns',
        },
        {
          recurringRuns: [
            buildMockJobKF({ recurring_run_id: 'other-pipeline', display_name: 'other-pipeline' }),
          ],
        },
      ).as('getRuns');

      schedulesDeleteModal.findSubmitButton().click();

      cy.wait('@deleteJobPipeline');

      cy.wait('@getRuns').then((interception) => {
        expect(interception.request.query).to.eql({ sort_by: 'created_at desc', page_size: '10' });

        pipelineRunJobTable.findEmptyState().should('not.exist');
      });
    });

    it('Test delete multiple schedules', () => {
      initIntercepts();

      pipelineRunsGlobal.visit('test-project');
      pipelineRunsGlobal.isApiAvailable();

      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunJobTable.getRowByName('test-pipeline').findCheckbox().click();
      pipelineRunJobTable.getRowByName('other-pipeline').findCheckbox().click();

      pipelineRunJobTable.findActionsKebab().findDropdownItem('Delete').click();

      schedulesDeleteModal.shouldBeOpen();
      schedulesDeleteModal.findSubmitButton().should('be.disabled');
      schedulesDeleteModal.findInput().type('Delete 2 schedules');
      schedulesDeleteModal.findSubmitButton().should('be.enabled');

      cy.intercept(
        {
          method: 'DELETE',
          pathname:
            '/api/service/pipelines/test-project/dspa/apis/v2beta1/recurringruns/test-pipeline',
        },
        mock200Status({}),
      ).as('deleteJobPipeline-1');

      cy.intercept(
        {
          method: 'DELETE',
          pathname:
            '/api/service/pipelines/test-project/dspa/apis/v2beta1/recurringruns/other-pipeline',
        },
        mock200Status({}),
      ).as('deleteJobPipeline-2');

      cy.intercept(
        {
          method: 'GET',
          pathname: '/api/service/pipelines/test-project/dspa/apis/v2beta1/recurringruns',
        },
        { recurringRuns: [] },
      ).as('getRuns');

      schedulesDeleteModal.findSubmitButton().click();

      cy.wait('@deleteJobPipeline-1');
      cy.wait('@deleteJobPipeline-2');

      cy.wait('@getRuns').then((interception) => {
        expect(interception.request.query).to.eql({ sort_by: 'created_at desc', page_size: '10' });
      });
      pipelineRunJobTable.findEmptyState().should('exist');
    });

    it('Test delete a single archived run', () => {
      initIntercepts();

      pipelineRunsGlobal.visit('test-project');
      pipelineRunsGlobal.isApiAvailable();

      pipelineRunsGlobal.findArchivedRunsTab().click();
      archivedRunsTable.getRowByName('test-pipeline').findKebabAction('Delete').click();

      runsDeleteModal.shouldBeOpen();
      runsDeleteModal.findSubmitButton().should('be.disabled');
      runsDeleteModal.findInput().type('test-pipeline');
      runsDeleteModal.findSubmitButton().should('be.enabled');

      cy.intercept(
        {
          method: 'DELETE',
          pathname: '/api/service/pipelines/test-project/dspa/apis/v2beta1/runs/test-pipeline',
        },
        mock200Status({}),
      ).as('deleteRunPipeline');

      cy.intercept(
        {
          method: 'GET',
          pathname: '/api/service/pipelines/test-project/dspa/apis/v2beta1/runs',
        },
        { runs: [buildMockRunKF({ run_id: 'other-pipeline', display_name: 'other-pipeline' })] },
      ).as('getRuns');

      runsDeleteModal.findSubmitButton().click();

      cy.wait('@deleteRunPipeline');

      cy.wait('@getRuns').then((interception) => {
        expect(interception.request.query).to.eql({
          sort_by: 'created_at desc',
          page_size: '10',
          filter:
            '{"predicates":[{"key":"storage_state","operation":"EQUALS","string_value":"AVAILABLE"}]}',
        });
      });
      archivedRunsTable.findEmptyState().should('not.exist');
    });

    it('Test delete multiple archived runs', () => {
      initIntercepts();

      pipelineRunsGlobal.visit('test-project');
      pipelineRunsGlobal.isApiAvailable();

      pipelineRunsGlobal.findArchivedRunsTab().click();
      archivedRunsTable.getRowByName('test-pipeline').findCheckbox().click();
      archivedRunsTable.getRowByName('other-pipeline').findCheckbox().click();

      archivedRunsTable.findActionsKebab().findDropdownItem('Delete').click();

      runsDeleteModal.shouldBeOpen();
      runsDeleteModal.findSubmitButton().should('be.disabled');
      runsDeleteModal.findInput().type('Delete 2 runs');
      runsDeleteModal.findSubmitButton().should('be.enabled');

      cy.intercept(
        {
          method: 'DELETE',
          pathname: '/api/service/pipelines/test-project/dspa/apis/v2beta1/runs/test-pipeline',
        },
        mock200Status({}),
      ).as('deleteRunPipeline-1');

      cy.intercept(
        {
          method: 'DELETE',
          pathname: '/api/service/pipelines/test-project/dspa/apis/v2beta1/runs/other-pipeline',
        },
        mock200Status({}),
      ).as('deleteRunPipeline-2');

      cy.intercept(
        {
          method: 'GET',
          pathname: '/api/service/pipelines/test-project/dspa/apis/v2beta1/runs',
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
          filter:
            '{"predicates":[{"key":"storage_state","operation":"EQUALS","string_value":"AVAILABLE"}]}',
        });
      });
      archivedRunsTable.findEmptyState().should('exist');
    });
  });
});
