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
import { mockServiceAccountK8sResource } from '~/__mocks__/mockServiceAccountK8sResource';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { ServingRuntimePlatform } from '~/types';

type HandlersProps = {
  isEmpty?: boolean;
  imageStreamName?: string;
  disableKServeConfig?: boolean;
  disableModelConfig?: boolean;
  isEnabled?: string;
  isUnknown?: boolean;
  templates?: boolean;
};

const initIntercepts = ({
  disableKServeConfig,
  disableModelConfig,
  isEmpty = false,
  imageStreamName = 'test-image',
  isEnabled = 'true',
  isUnknown = false,
  templates = false,
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

  cy.intercept(
    { pathname: '/api/k8s/apis/template.openshift.io/v1/namespaces/opendatahub/templates' },
    mockK8sResourceList(
      templates
        ? [
            mockServingRuntimeTemplateK8sResource({
              name: 'template-1',
              displayName: 'Multi Platform',
              platforms: [ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI],
            }),
          ]
        : [],
    ),
  );
  cy.intercept('/api/status', mockStatus());
  cy.intercept(
    '/api/config',
    mockDashboardConfig({
      disableKServe: disableKServeConfig,
      disableModelMesh: disableModelConfig,
    }),
  );
  cy.intercept(
    { pathname: '/api/k8s/api/v1/namespaces/test-project/pods' },
    mockK8sResourceList([mockPodK8sResource({})]),
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
      method: 'POST',
      pathname: '/api/k8s/api/v1/namespaces/test-project/serviceaccounts',
    },
    {
      statusCode: 200,
      body: mockServiceAccountK8sResource({
        name: 'test-name-sa',
        namespace: 'test-project',
      }),
    },
  );
  cy.intercept(
    { pathname: '/api/k8s/apis/project.openshift.io/v1/projects' },
    mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: undefined })]),
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
    {
      pathname: '/api/namespaces/test-project/*',
    },
    { statusCode: 200, body: { applied: true } },
  );
  cy.intercept(
    {
      method: 'GET',
      pathname:
        '/api/k8s/apis/opendatahub.io/v1alpha/namespaces/opendatahub/odhdashboardconfigs/odh-dashboard-config',
    },
    mockDashboardConfig({}),
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
      method: 'POST',
      pathname: '/api/proxy/apis/v1beta1/pipelines',
    },
    buildMockPipelines(isEmpty ? [] : [mockPipelineKF({})]),
  );
};

describe('Project Details', () => {
  describe('Empty project details', () => {
    it('Empty state component in project details', () => {
      initIntercepts({ isEmpty: true });
      projectDetails.visit('test-project');
      projectDetails.shouldBeEmptyState('workbenches', true);
      projectDetails.shouldBeEmptyState('cluster-storages', true);
      projectDetails.shouldBeEmptyState('data-connections', true);
      projectDetails.shouldBeEmptyState('pipelines-projects', true);
      projectDetails.shouldDivide();
    });

    it('Both model serving platforms are disabled', () => {
      initIntercepts({ disableKServeConfig: true, disableModelConfig: true });
      projectDetails.visit('test-project');
      projectDetails.shouldHaveNoPlatformSelectedText();
    });

    it('Both model serving platforms are enabled with no serving runtimes templates', () => {
      initIntercepts({ disableKServeConfig: false, disableModelConfig: false });
      projectDetails.visit('test-project');

      //single-model-serving platform
      projectDetails.findSingleModelDeployButton().should('have.attr', 'aria-disabled');
      projectDetails.findSingleModelDeployButton().trigger('mouseenter');
      projectDetails.findDeployModelTooltip().should('be.visible');

      //multi-model-serving platform
      projectDetails.findMultiModelButton().should('have.attr', 'aria-disabled');
      projectDetails.findMultiModelButton().trigger('mouseenter');
      projectDetails.findDeployModelTooltip().should('be.visible');
    });

    it('Single model serving platform is enabled', () => {
      initIntercepts({ templates: true, disableKServeConfig: false, disableModelConfig: true });
      projectDetails.visit('test-project');
      projectDetails.shouldBeEmptyState('model-server', true);
      projectDetails.findServingPlatformLabel().should('have.text', 'Single-model serving enabled');
    });

    it('Multi model serving platform is enabled', () => {
      initIntercepts({ templates: true, disableKServeConfig: true, disableModelConfig: false });
      projectDetails.visit('test-project');
      projectDetails.shouldBeEmptyState('model-server', true);

      projectDetails.findServingPlatformLabel().should('have.text', 'Multi-model serving enabled');
    });
  });

  describe('No empty project details', () => {
    it('No empty state components in the project details', () => {
      initIntercepts({});
      projectDetails.visit('test-project');
      projectDetails.shouldBeEmptyState('workbenches', false);
      projectDetails.shouldBeEmptyState('cluster-storages', false);
      projectDetails.shouldBeEmptyState('data-connections', false);
      projectDetails.shouldBeEmptyState('pipelines-projects', false);
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
});
