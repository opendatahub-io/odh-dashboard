import { mockStatus } from '~/__mocks__/mockStatus';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { pipelineRunsGlobal } from '~/__tests__/cypress/cypress/pages/pipelines';

const projectName = 'test-project-name';

describe('Pipeline Runs Global', () => {
  beforeEach(() => {
    initIntercepts();
    pipelineRunsGlobal.visit(projectName);
  });

  it('renders the page with scheduled and triggered runs table data', () => {
    // TODO
  });
});

const initIntercepts = () => {
  cy.intercept('/api/status', mockStatus());
  cy.intercept('/api/config', mockDashboardConfig({}));
  cy.intercept(
    {
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications/pipelines-definition`,
    },
    mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
  );
  cy.intercept(
    {
      pathname: `/api/k8s/apis/route.openshift.io/v1/namespaces/${projectName}/routes/ds-pipeline-pipelines-definition`,
    },
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-pipelines-definition',
      namespace: projectName,
    }),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
    },
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: projectName }),
      mockProjectK8sResource({ k8sName: `${projectName}-2`, displayName: 'Test Project 2' }),
    ]),
  );
};
