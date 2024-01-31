import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import { mockPipelineKF } from '~/__mocks__/mockPipelineKF';
import { buildMockPipelineVersion } from '~/__mocks__/mockPipelineVersionsProxy';
import { mockPipelinesVersionTemplateResourceKF } from '~/__mocks__/mockPipelinesTemplateResourceKF';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import { RelationshipKF, ResourceTypeKF } from '~/concepts/pipelines/kfTypes';
import {
  pipelineDetails,
  pipelineRunJobDetails,
  pipelinesTopology,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import { buildMockJobKF } from '~/__mocks__/mockJobKF';

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
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v1beta1/pipeline_versions/test-pipeline',
    },
    buildMockPipelineVersion({
      id: 'test-pipeline',
      name: 'test-pipeline',
      // eslint-disable-next-line camelcase
      resource_references: [
        {
          key: { type: ResourceTypeKF.PIPELINE, id: 'test-pipeline' },
          relationship: RelationshipKF.OWNER,
        },
      ],
    }),
  );

  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v1beta1/pipeline_versions/test-pipeline/templates',
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
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v1beta1/jobs/test-pipeline',
    },
    // eslint-disable-next-line camelcase
    buildMockJobKF({ display_name: 'test-pipeline', recurring_run_id: 'test-pipeline' }),
  );
};

describe('Pipeline topology', () => {
  describe('Pipeline details', () => {
    // TODO, remove skip after https://issues.redhat.com/browse/RHOAIENG-2282
    it.skip('Test pipeline topology renders', () => {
      initIntercepts();

      pipelineDetails.visit('test-project', 'test-pipeline');

      pipelinesTopology.findTaskNode('print-msg').click();
      pipelinesTopology
        .findTaskDrawer()
        .findByText('$(tasks.random-num.results.Output)')
        .should('exist');
      pipelinesTopology.findCloseDrawerButton().click();

      pipelinesTopology.findTaskNode('flip-coin').click();
      pipelinesTopology.findTaskDrawer().findByText('/tmp/outputs/Output/data').should('exist');
    });
  });

  describe('Pipeline run details', () => {
    // TODO, remove skip after https://issues.redhat.com/browse/RHOAIENG-2282
    it.skip('Test pipeline run topology renders', () => {
      initIntercepts();

      pipelineRunJobDetails.visit('test-project', 'test-pipeline');

      pipelineRunJobDetails.findBottomDrawer().findBottomDrawerDetailsTab().click();
      pipelineRunJobDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('Name')
        .findValue()
        .contains('test-pipeline');
      pipelineRunJobDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('Project')
        .findValue()
        .contains('Test Project');
      pipelineRunJobDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('Run ID')
        .findValue()
        .contains('test-pipeline');
      pipelineRunJobDetails
        .findBottomDrawer()
        .findBottomDrawerDetailItem('Workflow name')
        .findValue()
        .contains('conditional-execution-pipeline');
    });
  });
});
