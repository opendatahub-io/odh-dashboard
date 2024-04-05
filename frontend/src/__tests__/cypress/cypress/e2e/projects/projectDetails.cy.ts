import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockImageStreamK8sResource } from '~/__mocks__/mockImageStreamK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import { mockPipelineKFv2 } from '~/__mocks__/mockPipelineKF';
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
  imageStreamPythonDependencies?: string;
  v1PipelineServer?: boolean;
  pipelineServerInstalled?: boolean;
};

const initIntercepts = ({
  disableKServeConfig,
  disableModelConfig,
  isEmpty = false,
  imageStreamName = 'test-image',
  imageStreamPythonDependencies,
  isEnabled = 'true',
  isUnknown = false,
  templates = false,
  v1PipelineServer = false,
  pipelineServerInstalled = true,
}: HandlersProps) => {
  cy.intercept(
    { pathname: '/api/k8s/api/v1/namespaces/test-project/secrets' },
    mockK8sResourceList(isEmpty ? [] : [mockSecretK8sResource({})]),
  );
  cy.intercept(
    {
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/test-project/datasciencepipelinesapplications`,
    },
    mockK8sResourceList([mockDataSciencePipelineApplicationK8sResource({})]),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/test-project/datasciencepipelinesapplications/dspa`,
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
  if (pipelineServerInstalled) {
    cy.intercept(
      {
        pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/test-project/datasciencepipelinesapplications`,
      },
      mockK8sResourceList([
        mockDataSciencePipelineApplicationK8sResource({
          dspVersion: v1PipelineServer ? 'v1' : 'v2',
        }),
      ]),
    );
    cy.intercept(
      {
        method: 'GET',
        pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/test-project/datasciencepipelinesapplications/dspa`,
      },
      mockDataSciencePipelineApplicationK8sResource({ dspVersion: v1PipelineServer ? 'v1' : 'v2' }),
    );
    cy.intercept(
      {
        pathname: `/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/ds-pipeline-dspa`,
      },
      mockRouteK8sResource({
        notebookName: 'ds-pipeline-pipelines-definition',
        namespace: 'test-project',
      }),
    );
  }
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
      pathname: `/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/ds-pipeline-dspa`,
    },
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-dspa',
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
                      annotations: {
                        'opendatahub.io/notebook-python-dependencies':
                          imageStreamPythonDependencies ?? '[]',
                      },
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
      pathname: '/api/proxy/apis/v2beta1/pipelines',
    },
    buildMockPipelines(isEmpty ? [] : [mockPipelineKFv2({})]),
  );
};

describe('Project Details', () => {
  describe('Empty project details', () => {
    it('Empty state component in project details', () => {
      initIntercepts({ isEmpty: true });
      projectDetails.visit('test-project');
      projectDetails.shouldBeEmptyState('Workbenches', 'workbenches', true);
      projectDetails.shouldBeEmptyState('Cluster storage', 'cluster-storages', true);
      projectDetails.shouldBeEmptyState('Data connections', 'data-connections', true);
      projectDetails.shouldBeEmptyState('Pipelines', 'pipelines-projects', true);
    });

    it('Both model serving platforms are disabled', () => {
      initIntercepts({ disableKServeConfig: true, disableModelConfig: true });
      projectDetails.visit('test-project');
      projectDetails.shouldHaveNoPlatformSelectedText();
    });

    it('Both model serving platforms are enabled with no serving runtimes templates', () => {
      initIntercepts({ disableKServeConfig: false, disableModelConfig: false });
      projectDetails.visitSection('test-project', 'model-server');

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
      projectDetails.shouldBeEmptyState('Models', 'model-server', true);
      projectDetails.findServingPlatformLabel().should('have.text', 'Single-model serving enabled');
    });

    it('Multi model serving platform is enabled', () => {
      initIntercepts({ templates: true, disableKServeConfig: true, disableModelConfig: false });
      projectDetails.visit('test-project');
      projectDetails.shouldBeEmptyState('Models', 'model-server', true);

      projectDetails.findServingPlatformLabel().should('have.text', 'Multi-model serving enabled');
    });
  });

  describe('No empty project details', () => {
    it('No empty state components in the project details', () => {
      initIntercepts({});
      projectDetails.visit('test-project');
      projectDetails.shouldBeEmptyState('Workbenches', 'workbenches', false);
      projectDetails.shouldBeEmptyState('Cluster storage', 'cluster-storages', false);
      projectDetails.shouldBeEmptyState('Data connections', 'data-connections', false);
      projectDetails.shouldBeEmptyState('Pipelines', 'pipelines-projects', false);
    });

    it('Notebook with outdated Elyra image shows alert and v2 pipeline server', () => {
      initIntercepts({ imageStreamPythonDependencies: '[{"name":"Elyra","version":"3.15"}]' });
      projectDetails.visitSection('test-project', 'workbenches');
      const notebookRow = projectDetails.getNotebookRow('test-notebook');
      notebookRow.findOutdatedElyraInfo().should('be.visible');
      projectDetails.findElyraInvalidVersionAlert().should('be.visible');
    });

    it('Notebook with updated Elyra image and v1 pipeline server', () => {
      initIntercepts({
        imageStreamPythonDependencies: '[{"name":"odh-elyra","version":"3.16"}]',
        v1PipelineServer: true,
      });

      projectDetails.visitSection('test-project', 'workbenches');
      projectDetails.findUnsupportedPipelineVersionAlert().should('be.visible');
    });

    it('Notebooks with outdated Elyra image and no pipeline server', () => {
      initIntercepts({
        imageStreamPythonDependencies: '[{"name":"Elyra","version":"3.15"}]',
        pipelineServerInstalled: false,
      });
      projectDetails.visitSection('test-project', 'workbenches');
      const notebookRow = projectDetails.getNotebookRow('test-notebook');
      notebookRow.findOutdatedElyraInfo().should('not.exist');
      projectDetails.findElyraInvalidVersionAlert().should('not.exist');
    });
    it('Notebook with updated Elyra image and no pipeline server', () => {
      initIntercepts({
        imageStreamPythonDependencies: '[{"name":"odh-elyra","version":"3.16"}]',
        pipelineServerInstalled: false,
      });

      projectDetails.visitSection('test-project', 'workbenches');
      projectDetails.findUnsupportedPipelineVersionAlert().should('not.exist');
    });

    it('Notebook with deleted image', () => {
      initIntercepts({ imageStreamName: 'test' });
      projectDetails.visitSection('test-project', 'workbenches');
      const notebookRow = projectDetails.getNotebookRow('test-notebook');
      notebookRow.shouldHaveNotebookImageName('Test image');
      notebookRow.findNotebookImageAvailability().should('have.text', 'Deleted');
    });

    it('Notebook with disabled image', () => {
      initIntercepts({ isEnabled: 'false' });
      projectDetails.visitSection('test-project', 'workbenches');
      const notebookRow = projectDetails.getNotebookRow('test-notebook');
      notebookRow.shouldHaveNotebookImageName('Test image');
      notebookRow.findNotebookImageAvailability().should('have.text', 'Disabled');
    });

    it('Notebook with unknown image', () => {
      initIntercepts({ isUnknown: true });
      projectDetails.visitSection('test-project', 'workbenches');
      projectDetails.getNotebookRow('test-notebook').shouldHaveNotebookImageName('unknown');
    });
  });
});
