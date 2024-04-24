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
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { ServingRuntimePlatform } from '~/types';
import {
  DataSciencePipelineApplicationModel,
  ImageStreamModel,
  NotebookModel,
  PVCModel,
  PodModel,
  ProjectModel,
  RouteModel,
  SecretModel,
  ServiceAccountModel,
  TemplateModel,
} from '~/__tests__/cypress/cypress/utils/models';

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
  cy.interceptK8sList(
    { model: SecretModel, ns: 'test-project' },
    mockK8sResourceList(isEmpty ? [] : [mockSecretK8sResource({})]),
  );
  cy.interceptK8sList(
    DataSciencePipelineApplicationModel,
    mockK8sResourceList([mockDataSciencePipelineApplicationK8sResource({})]),
  );
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({}),
  );
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        workbenches: true,
        'data-science-pipelines-operator': true,
        kserve: true,
        'model-mesh': true,
      },
    }),
  );

  cy.interceptK8sList(
    { model: TemplateModel, ns: 'opendatahub' },
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
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableKServe: disableKServeConfig,
      disableModelMesh: disableModelConfig,
    }),
  );
  if (pipelineServerInstalled) {
    cy.interceptK8sList(
      DataSciencePipelineApplicationModel,
      mockK8sResourceList([
        mockDataSciencePipelineApplicationK8sResource({
          dspVersion: v1PipelineServer ? 'v1' : 'v2',
        }),
      ]),
    );
    cy.interceptK8s(
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({ dspVersion: v1PipelineServer ? 'v1' : 'v2' }),
    );
  }
  cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({})]));
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({}));
  cy.interceptK8s(
    RouteModel,
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-dspa',
    }),
  );
  cy.interceptK8sList(
    { model: PVCModel, ns: 'test-project' },
    mockK8sResourceList(isEmpty ? [] : [mockPVCK8sResource({})]),
  );
  cy.interceptK8s(
    'POST',
    ServiceAccountModel,

    {
      statusCode: 200,
      body: mockServiceAccountK8sResource({
        name: 'test-name-sa',
        namespace: 'test-project',
      }),
    },
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: undefined })]),
  );

  cy.interceptK8sList(
    {
      model: ImageStreamModel,
      ns: 'opendatahub',
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
  cy.interceptOdh(
    'GET /api/namespaces/:namespace/:context',
    { path: { namespace: 'test-project', context: '*' } },
    { applied: true },
  );
  cy.interceptK8sList(
    { model: NotebookModel, ns: 'test-project' },
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
  cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'test-notebook' }));
  cy.intercept(
    {
      method: 'GET',
      pathname: `/api/service/pipelines/test-project/dspa/apis/v2beta1/pipelines`,
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
      notebookRow.findOutdatedElyraInfo().should('be.visible');
      projectDetails.findElyraInvalidVersionAlert().should('be.visible');
      projectDetails.findUnsupportedPipelineVersionAlert().should('not.exist');
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
