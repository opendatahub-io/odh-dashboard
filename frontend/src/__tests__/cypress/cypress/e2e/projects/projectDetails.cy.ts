import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockImageStreamK8sResource } from '~/__mocks__/mockImageStreamK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import { mockPipelineKF } from '~/__mocks__/mockPipelineKF';
import { buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';

type HandlersProps = {
  isEmpty?: boolean;
  imageStreamName?: string;
  isEnabled?: string;
  isUnknown?: boolean;
};

const initIntercepts = ({
  isEmpty = false,
  imageStreamName = 'test-image',
  isEnabled = 'true',
  isUnknown = false,
}: HandlersProps) => {
  cy.intercept(
    { pathname: '/api/k8s/api/v1/namespaces/test-project/secrets' },
    mockK8sResourceList(isEmpty ? [] : [mockSecretK8sResource({})]),
  );
  cy.intercept(
    {
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/test-project/datasciencepipelinesapplications/pipelines-definition`,
    },
    mockDataSciencePipelineApplicationK8sResource({}),
  );
  cy.intercept(
    '/api/dsc/status',
    mockDscStatus({
      installedComponents: {
        workbenches: true,
        'data-science-pipelines-operator': true,
        kserve: true,
        'model-mesh': true,
      },
    }),
  );
  cy.intercept('/api/status', mockStatus());
  cy.intercept('/api/config', mockDashboardConfig({}));
  cy.intercept(
    { pathname: '/api/k8s/api/v1/namespaces/test-project/pods' },
    mockK8sResourceList([mockPodK8sResource({})]),
  );
  cy.intercept(
    '/api/k8s/apis/template.openshift.io/v1/namespaces/opendatahub/templates',
    mockK8sResourceList([mockServingRuntimeTemplateK8sResource({})]),
  );
  cy.intercept(
    { pathname: '/api/k8s/apis/project.openshift.io/v1/projects' },
    mockK8sResourceList([mockProjectK8sResource({})]),
  );
  cy.intercept(
    { pathname: '/api/k8s/apis/project.openshift.io/v1/projects/test-project' },
    mockProjectK8sResource({}),
  );
  cy.intercept(
    {
      pathname: `/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/ds-pipeline-pipelines-definition`,
    },
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-pipelines-definition',
    }),
  );
  cy.intercept(
    { pathname: '/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims' },
    mockK8sResourceList(isEmpty ? [] : [mockPVCK8sResource({})]),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/apis/image.openshift.io/v1/namespaces/opendatahub/imagestreams',
    },
    mockK8sResourceList(
      isEmpty || isUnknown
        ? []
        : [
            mockImageStreamK8sResource({
              name: imageStreamName,
              displayName: 'Test image',
              opts: {
                metadata: {
                  labels: {
                    'opendatahub.io/notebook-image': isEnabled,
                  },
                },
                spec: {
                  tags: [
                    {
                      name: 'latest',
                    },
                  ],
                },
                status: {
                  tags: [
                    {
                      tag: 'latest',
                    },
                  ],
                },
              },
            }),
          ],
    ),
  );
  cy.intercept(
    { pathname: '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks' },
    mockK8sResourceList(
      isEmpty
        ? []
        : [
            mockNotebookK8sResource({
              opts: {
                spec: {
                  template: {
                    spec: {
                      containers: [
                        {
                          name: 'test-notebook',
                          image: 'test-image:latest',
                        },
                      ],
                    },
                  },
                },
                metadata: {
                  name: 'test-notebook',
                  labels: {
                    'opendatahub.io/notebook-image': 'true',
                  },
                  annotations: {
                    'opendatahub.io/image-display-name': isUnknown ? '' : 'Test image',
                  },
                },
              },
            }),
          ],
    ),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/test-notebook',
    },
    mockRouteK8sResource({ notebookName: 'test-notebook' }),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/service/pipelines/test-project/pipelines-definition/apis/v1beta1/pipelines',
    },
    buildMockPipelines(isEmpty ? [] : [mockPipelineKF({})]),
  );
};

describe('Project Details', () => {
  it('Empty project', () => {
    initIntercepts({ isEmpty: true });
    projectDetails.visit('test-project');
    projectDetails.findEmptyState('workbenches');
    projectDetails.findEmptyState('cluster-storages');
    projectDetails.findEmptyState('data-connections');
    projectDetails.findEmptyState('pipelines-projects');
    projectDetails.shouldDivide();
  });

  it('No empty project', () => {
    initIntercepts({});
    projectDetails.visit('test-project');
    projectDetails.findEmptyState('workbenches').should('not.exist');
    projectDetails.findEmptyState('cluster-storages').should('not.exist');
    projectDetails.findEmptyState('data-connections').should('not.exist');
    projectDetails.findEmptyState('pipelines-projects').should('not.exist');
  });

  it('Notebook with deleted image', () => {
    initIntercepts({ imageStreamName: 'test' });
    projectDetails.visit('test-project');
    const notebookRow = projectDetails.getNotebookRow('test-notebook');
    notebookRow.shouldHaveNotebookImageName('Test image');
    notebookRow.findNotebookImageAvailability().should('have.text', 'Deleted');
  });

  it('Notebook with disabled image', () => {
    initIntercepts({ isEnabled: 'false' });
    projectDetails.visit('test-project');
    const notebookRow = projectDetails.getNotebookRow('test-notebook');
    notebookRow.shouldHaveNotebookImageName('Test image');
    notebookRow.findNotebookImageAvailability().should('have.text', 'Disabled');
  });

  it('Notebook with unknown image', () => {
    initIntercepts({ isUnknown: true });
    projectDetails.visit('test-project');
    projectDetails.getNotebookRow('test-notebook').shouldHaveNotebookImageName('unknown');
  });
});
