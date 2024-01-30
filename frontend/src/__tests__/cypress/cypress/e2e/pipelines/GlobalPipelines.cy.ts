import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import { globalPipelines } from '~/__tests__/cypress/cypress/pages/pipelines';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';

const initIntercepts = () => {
  cy.intercept('/api/status', mockStatus());
  cy.intercept('/api/config', mockDashboardConfig({}));
  cy.intercept(
    {
      pathname:
        '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/ds-pipeline-pipelines-definition',
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
      pathname: '/api/k8s/api/v1/namespaces/test-project/secrets/aws-connection-testdb',
    },
    mockSecretK8sResource({ name: 'aws-connection-testdb' }),
  ),
    cy.intercept(
      '/api/dsc/status',
      mockDscStatus({
        installedComponents: { 'data-science-pipelines-operator': true },
      }),
    );
  cy.intercept(
    {
      method: 'GET',
      pathname:
        '/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/test-project/datasciencepipelinesapplications/pipelines-definition',
    },
    mockDataSciencePipelineApplicationK8sResource({ dspVersion: 'v1' }),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
    },
    mockK8sResourceList([mockProjectK8sResource({})]),
  );
};

describe('Global pipelines', () => {
  it('Test incompatible dpsa version shows error', () => {
    initIntercepts();

    globalPipelines.visit('test-project');
    globalPipelines.findIsApiAvailable().should('exist');
    globalPipelines.findIsServerIncompatible().should('exist');
  });
});
