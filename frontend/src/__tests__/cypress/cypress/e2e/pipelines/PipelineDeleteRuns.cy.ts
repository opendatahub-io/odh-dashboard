/* eslint-disable camelcase */
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import { mockPipelineKF } from '~/__mocks__/mockPipelineKF';
import { buildMockJobKF } from '~/__mocks__/mockJobKF';
import { mockPipelinesVersionTemplateResourceKF } from '~/__mocks__/mockPipelinesTemplateResourceKF';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import { buildMockRunKF } from '~/__mocks__/mockRunKF';
import {
  pipelineRunJobTable,
  pipelineRunsGlobal,
  pipelineRunTable,
  scheduledRunDeleteModal,
  scheduledRunDeleteMultipleModal,
  triggeredRunDeleteModal,
  triggeredRunDeleteMultipleModal,
} from '~/__tests__/cypress/cypress/pages/pipelines';

const initIntercepts = () => {
  cy.intercept('/api/status', mockStatus());
  cy.intercept('/api/config', mockDashboardConfig({}));
  cy.intercept(
    '/api/dsc/status',
    mockDscStatus({
      installedComponents: { 'data-science-pipelines-operator': true },
    }),
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v1beta1/pipelines/test-pipeline',
    },
    mockPipelineKF({}),
  );
  // TODO, https://issues.redhat.com/browse/RHOAIENG-2273
  // cy.intercept(
  //   {
  //     method: 'POST',
  //     pathname: '/api/proxy/apis/v1beta1/jobs',
  //   },
  //   {
  //     jobs: [
  //       buildMockJobKF({ name: 'test-pipeline', id: 'test-pipeline' }),
  //       buildMockJobKF({ name: 'other-pipeline', id: 'other-pipeline' }),
  //     ],
  //   },
  // );
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v2beta1/runs',
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
      pathname: '/api/proxy/apis/v1beta1/pipelines',
    },
    mockPipelineKF({}),
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v1beta1/pipelines/test-pipeline/templates',
    },
    mockPipelinesVersionTemplateResourceKF(),
  );
  cy.intercept(
    {
      pathname:
        '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/ds-pipeline-dspa',
    },
    mockRouteK8sResource({ notebookName: 'ds-pipeline-pipelines-definition' }),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/api/v1/namespaces/test-project/secrets/ds-pipeline-config',
    },
    mockSecretK8sResource({ name: 'ds-pipeline-config' }),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/api/v1/namespaces/test-project/secrets/pipelines-db-password',
    },
    mockSecretK8sResource({ name: 'pipelines-db-password' }),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/api/v1/namespaces/test-project/secrets/aws-connection-testdb',
    },
    mockSecretK8sResource({ name: 'aws-connection-testdb' }),
  );
  cy.intercept(
    {
      pathname:
        '/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/test-project/datasciencepipelinesapplications',
    },
    mockK8sResourceList([mockDataSciencePipelineApplicationK8sResource({})]),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname:
        '/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/test-project/datasciencepipelinesapplications/dspa',
    },
    mockDataSciencePipelineApplicationK8sResource({}),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks',
    },
    mockK8sResourceList([mockNotebookK8sResource({})]),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
    },
    mockK8sResourceList([mockProjectK8sResource({})]),
  );
};

describe('Pipeline delete runs', () => {
  // TODO, don't skip after https://issues.redhat.com/browse/RHOAIENG-2273
  it.skip('Test delete a single run from scheduled', () => {
    initIntercepts();

    pipelineRunsGlobal.visit('test-project');
    pipelineRunsGlobal.isApiAvailable();

    pipelineRunsGlobal.findScheduledTab().click();
    pipelineRunJobTable.findRowByName('test-pipeline').findKebabAction('Delete').click();

    scheduledRunDeleteModal.shouldBeOpen();
    scheduledRunDeleteModal.findSubmitButton().should('be.disabled');
    scheduledRunDeleteModal.findInput().type('test-pipeline');
    scheduledRunDeleteModal.findSubmitButton().should('be.enabled');

    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v1beta1/jobs/test-pipeline',
      },
      mockStatus(),
    ).as('postJobPipeline');

    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v1beta1/jobs',
      },
      { jobs: [buildMockJobKF({ id: 'other-pipeline', name: 'other-pipeline' })] },
    ).as('getRuns');

    scheduledRunDeleteModal.findSubmitButton().click();

    cy.wait('@postJobPipeline').then((intercept) => {
      expect(intercept.request.body).to.eql({
        path: '/apis/v1beta1/jobs/test-pipeline',
        method: 'DELETE',
        host: 'https://ds-pipeline-pipelines-definition-test-project.apps.user.com',
        queryParams: {},
        data: {},
      });
    });
    cy.wait('@getRuns').then(() => {
      pipelineRunJobTable.findEmptyState().should('not.exist');
    });
  });
  // TODO, don't skip after https://issues.redhat.com/browse/RHOAIENG-2273
  it.skip('Test delete multiple runs from scheduled', () => {
    initIntercepts();

    pipelineRunsGlobal.visit('test-project');
    pipelineRunsGlobal.isApiAvailable();

    pipelineRunsGlobal.findScheduledTab().click();
    pipelineRunJobTable.findRowByName('test-pipeline').findByLabelText('Checkbox').click();
    pipelineRunJobTable.findRowByName('other-pipeline').findByLabelText('Checkbox').click();

    pipelineRunJobTable.findActionsKebab().findDropdownItem('Delete selected').click();

    scheduledRunDeleteMultipleModal.shouldBeOpen();
    scheduledRunDeleteMultipleModal.findSubmitButton().should('be.disabled');
    scheduledRunDeleteMultipleModal.findInput().type('Delete 2 scheduled runs');
    scheduledRunDeleteMultipleModal.findSubmitButton().should('be.enabled');

    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v1beta1/jobs/test-pipeline',
      },
      mockStatus(),
    ).as('postJobPipeline-1');

    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v1beta1/jobs/other-pipeline',
      },
      mockStatus(),
    ).as('postJobPipeline-2');

    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v1beta1/jobs',
      },
      { jobs: [] },
    ).as('getRuns');

    scheduledRunDeleteMultipleModal.findSubmitButton().click();

    cy.wait('@postJobPipeline-1').then((intercept) => {
      expect(intercept.request.body).to.eql({
        path: '/apis/v1beta1/jobs/test-pipeline',
        method: 'DELETE',
        host: 'https://ds-pipeline-pipelines-definition-test-project.apps.user.com',
        queryParams: {},
        data: {},
      });
    });

    cy.wait('@postJobPipeline-2').then((intercept) => {
      expect(intercept.request.body).to.eql({
        path: '/apis/v1beta1/jobs/other-pipeline',
        method: 'DELETE',
        host: 'https://ds-pipeline-pipelines-definition-test-project.apps.user.com',
        queryParams: {},
        data: {},
      });
    });

    cy.wait('@getRuns').then(() => {
      pipelineRunJobTable.findEmptyState().should('exist');
    });
  });
  it('Test delete a single run from triggered', () => {
    initIntercepts();

    pipelineRunsGlobal.visit('test-project');
    pipelineRunsGlobal.isApiAvailable();

    pipelineRunsGlobal.findTriggeredTab().click();
    pipelineRunTable.findRowByName('test-pipeline').findKebabAction('Delete').click();

    triggeredRunDeleteModal.shouldBeOpen();
    triggeredRunDeleteModal.findSubmitButton().should('be.disabled');
    triggeredRunDeleteModal.findInput().type('test-pipeline');
    triggeredRunDeleteModal.findSubmitButton().should('be.enabled');

    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v2beta1/runs/test-pipeline',
      },
      mockStatus(),
    ).as('postRunPipeline');

    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v2beta1/runs',
      },
      { runs: [buildMockRunKF({ run_id: 'other-pipeline', display_name: 'other-pipeline' })] },
    ).as('getRuns');

    triggeredRunDeleteModal.findSubmitButton().click();

    cy.wait('@postRunPipeline').then((intercept) => {
      expect(intercept.request.body).to.eql({
        path: '/apis/v2beta1/runs/test-pipeline',
        method: 'DELETE',
        host: 'https://ds-pipeline-pipelines-definition-test-project.apps.user.com',
        queryParams: {},
        data: {},
      });
    });
    cy.wait('@getRuns').then(() => {
      pipelineRunTable.findEmptyState().should('not.exist');
    });
  });
  it('Test delete multiple runs from triggered', () => {
    initIntercepts();

    pipelineRunsGlobal.visit('test-project');
    pipelineRunsGlobal.isApiAvailable();

    pipelineRunsGlobal.findTriggeredTab().click();
    pipelineRunTable.findRowByName('test-pipeline').findByLabelText('Checkbox').click();
    pipelineRunTable.findRowByName('other-pipeline').findByLabelText('Checkbox').click();

    pipelineRunTable.findActionsKebab().findDropdownItem('Delete selected').click();

    triggeredRunDeleteMultipleModal.shouldBeOpen();
    triggeredRunDeleteMultipleModal.findSubmitButton().should('be.disabled');
    triggeredRunDeleteMultipleModal.findInput().type('Delete 2 triggered runs');
    triggeredRunDeleteMultipleModal.findSubmitButton().should('be.enabled');

    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v2beta1/runs/test-pipeline',
      },
      mockStatus(),
    ).as('postRunPipeline-1');

    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v2beta1/runs/other-pipeline',
      },
      mockStatus(),
    ).as('postRunPipeline-2');

    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v2beta1/runs',
      },
      { runs: [] },
    ).as('getRuns');

    triggeredRunDeleteMultipleModal.findSubmitButton().click();

    cy.wait('@postRunPipeline-1').then((intercept) => {
      expect(intercept.request.body).to.eql({
        path: '/apis/v2beta1/runs/test-pipeline',
        method: 'DELETE',
        host: 'https://ds-pipeline-pipelines-definition-test-project.apps.user.com',
        queryParams: {},
        data: {},
      });
    });

    cy.wait('@postRunPipeline-2').then((intercept) => {
      expect(intercept.request.body).to.eql({
        path: '/apis/v2beta1/runs/other-pipeline',
        method: 'DELETE',
        host: 'https://ds-pipeline-pipelines-definition-test-project.apps.user.com',
        queryParams: {},
        data: {},
      });
    });
    cy.wait('@getRuns').then(() => {
      pipelineRunTable.findEmptyState().should('exist');
    });
  });
});
