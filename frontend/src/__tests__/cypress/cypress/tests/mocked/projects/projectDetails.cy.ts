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
import {
  deleteProjectModal,
  editProjectModal,
  projectDetails,
} from '~/__tests__/cypress/cypress/pages/projects';
import { ServingRuntimePlatform } from '~/types';
import {
  DataSciencePipelineApplicationModel,
  ImageStreamModel,
  InferenceServiceModel,
  NIMAccountModel,
  NotebookModel,
  PodModel,
  ProjectModel,
  PVCModel,
  RouteModel,
  SecretModel,
  ServiceAccountModel,
  ServingRuntimeModel,
  TemplateModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import { asProjectAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { NamespaceApplicationCase } from '~/pages/projects/types';
import { mockNimServingRuntimeTemplate } from '~/__mocks__/mockNimResource';
import { mockNimAccount } from '~/__mocks__/mockNimAccount';

type HandlersProps = {
  isEmpty?: boolean;
  imageStreamName?: string;
  imageStreamTag?: string;
  disableKServeConfig?: boolean;
  disableKServeMetrics?: boolean;
  disableModelConfig?: boolean;
  disableNIMConfig?: boolean;
  enableModelMesh?: boolean;
  enableNIM?: boolean;
  isEnabled?: string;
  isUnknown?: boolean;
  templates?: boolean;
  imageStreamPythonDependencies?: string;
  v1PipelineServer?: boolean;
  pipelineServerInstalled?: boolean;
  pipelineServerInitializing?: boolean;
  pipelineServerErrorMessage?: string;
  rejectAddSupportServingPlatformProject?: boolean;
  disableWorkbenches?: boolean;
};

const initIntercepts = ({
  disableKServeConfig,
  disableKServeMetrics,
  disableModelConfig,
  disableNIMConfig = true,
  enableModelMesh,
  enableNIM = false,
  isEmpty = false,
  imageStreamName = 'test-image',
  imageStreamTag = 'latest',
  imageStreamPythonDependencies,
  isEnabled = 'true',
  isUnknown = false,
  templates = false,
  v1PipelineServer = false,
  pipelineServerInstalled = true,
  pipelineServerInitializing,
  pipelineServerErrorMessage,
  rejectAddSupportServingPlatformProject = false,
  disableWorkbenches = false,
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
        workbenches: !disableWorkbenches,
        'data-science-pipelines-operator': true,
        kserve: true,
        'model-mesh': true,
        'model-registry-operator': true,
      },
    }),
  );

  cy.interceptK8sList(
    { model: TemplateModel, ns: 'opendatahub' },
    mockK8sResourceList([
      ...(templates
        ? [
            mockServingRuntimeTemplateK8sResource({
              name: 'template-1',
              displayName: 'Multi Platform',
              platforms: [ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI],
            }),
          ]
        : []),
      ...(!disableNIMConfig ? [mockNimServingRuntimeTemplate()] : []),
    ]),
  );
  if (!disableNIMConfig) {
    cy.interceptK8s(TemplateModel, mockNimServingRuntimeTemplate());
  }
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableKServe: disableKServeConfig,
      disableModelMesh: disableModelConfig,
      disableNIMModelServing: disableNIMConfig,
      disableKServeMetrics,
    }),
  );
  if (pipelineServerInstalled) {
    cy.interceptK8sList(
      DataSciencePipelineApplicationModel,
      mockK8sResourceList([
        mockDataSciencePipelineApplicationK8sResource({
          dspVersion: v1PipelineServer ? 'v1' : 'v2',
          message: pipelineServerErrorMessage,
          initializing: pipelineServerInitializing,
        }),
      ]),
    );
    cy.interceptK8s(
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({
        dspVersion: v1PipelineServer ? 'v1' : 'v2',
        message: pipelineServerErrorMessage,
        initializing: pipelineServerInitializing,
      }),
    );
  }
  cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({})]));

  const mockProject = mockProjectK8sResource({ enableModelMesh, enableNIM });
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProject]));
  cy.interceptK8s(ProjectModel, mockProject);

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
                      name: imageStreamTag,
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
                      tag: imageStreamTag,
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
    rejectAddSupportServingPlatformProject ? { statusCode: 401 } : { applied: true },
  ).as('addSupportServingPlatformProject');
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
    buildMockPipelines(isEmpty ? [] : [mockPipelineKF({})]),
  );

  cy.interceptK8sList(NIMAccountModel, mockK8sResourceList([mockNimAccount({})]));
};

describe('Project Details', () => {
  const servingRuntimes = [mockServingRuntimeK8sResource({})];
  const inferenceServices = [mockInferenceServiceK8sResource({})];
  const initModelServingIntercepts = () => {
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList(servingRuntimes));
    cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList(inferenceServices));
  };

  describe('Empty project details', () => {
    it('Empty state component in project details', () => {
      initIntercepts({ isEmpty: true });
      projectDetails.visit('test-project');
      projectDetails.shouldBeEmptyState('Workbenches', 'workbenches', true);
      projectDetails.shouldBeEmptyState('Cluster storage', 'cluster-storages', true);
      projectDetails.shouldBeEmptyState('Data connections', 'data-connections', true);
      projectDetails.shouldBeEmptyState('Pipelines', 'pipelines-projects', true);
    });

    it('Shows project information', () => {
      initIntercepts({ disableKServeConfig: true, disableModelConfig: true });
      projectDetails.visit('test-project');
      projectDetails.showProjectResourceDetails();
      projectDetails.findProjectResourceNameText().should('have.text', 'test-project');
      projectDetails.findProjectResourceKindText().should('have.text', 'Project');
    });

    it('Should show pipeline server error when the server has errors', () => {
      initIntercepts({
        pipelineServerInitializing: true,
        pipelineServerErrorMessage: 'Data connection unsuccessfully verified',
      });
      projectDetails.visit('test-project');
      projectDetails
        .findPipelineTimeoutErrorMessage()
        .should('have.text', 'Data connection unsuccessfully verified');
      projectDetails.findTab('Pipelines').click();
      projectDetails
        .findPipelineTimeoutErrorMessage()
        .should('have.text', 'Data connection unsuccessfully verified');
    });

    it('Should not allow actions for non-provisioning users', () => {
      asProjectAdminUser({ isSelfProvisioner: false });
      initIntercepts({ disableKServeConfig: true, disableModelConfig: true });
      projectDetails.visit('test-project');

      projectDetails.findProjectActions().should('not.exist');
    });

    it('Should allow actions for provisioning users', () => {
      asProjectAdminUser({ isSelfProvisioner: true });
      initIntercepts({ disableKServeConfig: true, disableModelConfig: true });
      projectDetails.visit('test-project');

      projectDetails.showProjectActions();
      projectDetails.findEditProjectAction().click();

      editProjectModal.shouldBeOpen();
      editProjectModal.findCancelButton().click();
      editProjectModal.shouldBeOpen(false);

      projectDetails.showProjectActions();
      projectDetails.findDeleteProjectAction().click();
      deleteProjectModal.shouldBeOpen();
      deleteProjectModal.findCancelButton().click();
      deleteProjectModal.shouldBeOpen(false);
    });

    it('Both model serving platforms are disabled', () => {
      initIntercepts({ disableKServeConfig: true, disableModelConfig: true });
      projectDetails.visit('test-project');
      projectDetails.shouldHaveNoPlatformSelectedText();
    });

    it('Both model serving platforms are enabled, no platform selected', () => {
      initIntercepts({ disableKServeConfig: false, disableModelConfig: false });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findSelectPlatformButton('single').should('exist');
      projectDetails.findSelectPlatformButton('multi').should('exist');
    });

    it('Only single serving platform enabled, no serving runtimes templates', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: true,
      });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findTopLevelDeployModelButton().should('have.attr', 'aria-disabled');
      projectDetails.findTopLevelDeployModelButton().trigger('mouseenter');
      projectDetails.findDeployModelTooltip().should('be.visible');
    });

    it('Only multi serving platform enabled, no serving runtimes templates', () => {
      initIntercepts({
        disableKServeConfig: true,
        disableModelConfig: false,
      });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findTopLevelAddModelServerButton().should('have.attr', 'aria-disabled');
      projectDetails.findTopLevelAddModelServerButton().trigger('mouseenter');
      projectDetails.findDeployModelTooltip().should('be.visible');
    });

    it('Both model serving platforms are enabled, single-model platform is selected, no serving runtimes templates', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: false,
      });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findTopLevelDeployModelButton().should('have.attr', 'aria-disabled');
      projectDetails.findTopLevelDeployModelButton().trigger('mouseenter');
      projectDetails.findDeployModelTooltip().should('be.visible');
    });

    it('Both model serving platforms are enabled, multi-model platform is selected, no serving runtimes templates', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: true,
      });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findTopLevelAddModelServerButton().should('have.attr', 'aria-disabled');
      projectDetails.findTopLevelAddModelServerButton().trigger('mouseenter');
      projectDetails.findDeployModelTooltip().should('be.visible');
    });

    it('Single model serving platform is enabled', () => {
      initIntercepts({ templates: true, disableKServeConfig: false, disableModelConfig: true });
      projectDetails.visit('test-project');
      projectDetails.shouldBeEmptyState('Models', 'model-server', true);
      projectDetails.findServingPlatformLabel().should('have.text', 'Single-model serving enabled');
    });

    it('Shows KServe metrics only when available', () => {
      initIntercepts({ templates: true, disableKServeConfig: false, disableModelConfig: true });
      initModelServingIntercepts();

      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.getKserveModelMetricLink('Test Inference Service').should('not.exist');

      initIntercepts({
        templates: true,
        disableKServeConfig: false,
        disableModelConfig: true,
        disableKServeMetrics: false,
      });
      initModelServingIntercepts();

      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.getKserveModelMetricLink('Test Inference Service').should('be.visible');
      projectDetails.getKserveModelMetricLink('Test Inference Service').click();
      cy.findByTestId('app-page-title').should('have.text', 'Test Inference Service metrics');
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
      initIntercepts({ imageStreamName: 'test', imageStreamTag: 'failing-tag' });
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

  describe('Selecting a model serving platform', () => {
    it('Select single-model serving on models tab', () => {
      initIntercepts({ disableKServeConfig: false, disableModelConfig: false });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findSelectPlatformButton('single').click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.KSERVE_PROMOTION}`,
        );
      });
    });

    it('Un-select single-model serving on models tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: false,
      });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findResetPlatformButton().click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}`,
        );
      });
    });

    it('Select multi-model serving on models tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
      });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findSelectPlatformButton('multi').click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.MODEL_MESH_PROMOTION}`,
        );
      });
    });

    it('Un-select multi-model serving on models tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: true,
      });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findResetPlatformButton().click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}`,
        );
      });
    });

    it('Select NIM serving on models tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        disableNIMConfig: false,
      });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findSelectPlatformButton('nim').click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.KSERVE_NIM_PROMOTION}`,
        );
      });
    });

    it('Un-select NIM serving on models tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        disableNIMConfig: false,
        enableModelMesh: false,
        enableNIM: true,
      });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findResetPlatformButton().click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}`,
        );
      });
    });

    it('Show error when failed to select platform on overview tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        rejectAddSupportServingPlatformProject: true,
      });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findSelectPlatformButton('single').click();
      projectDetails.findErrorSelectingPlatform().should('exist');
    });

    it('Show error when failed to un-select platform on overview tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: false,
        rejectAddSupportServingPlatformProject: true,
      });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findResetPlatformButton().click();
      projectDetails.findErrorSelectingPlatform().should('exist');
    });

    it('Select single-model serving on overview tab', () => {
      initIntercepts({ disableKServeConfig: false, disableModelConfig: false });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findSelectPlatformButton('single').click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.KSERVE_PROMOTION}`,
        );
      });
    });

    it('Un-select single-model serving on overview tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: false,
      });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findResetPlatformButton().click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}`,
        );
      });
    });

    it('Select multi-model serving on overview tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
      });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findSelectPlatformButton('multi').click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.MODEL_MESH_PROMOTION}`,
        );
      });
    });

    it('Un-select multi-model serving on overview tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: true,
      });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findResetPlatformButton().click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}`,
        );
      });
    });

    it('Select NIM serving on overview tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        disableNIMConfig: false,
      });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findSelectPlatformButton('nim').click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.KSERVE_NIM_PROMOTION}`,
        );
      });
    });

    it('Un-select NIM serving on overview tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        disableNIMConfig: false,
        enableModelMesh: false,
        enableNIM: true,
      });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findResetPlatformButton().click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}`,
        );
      });
    });

    it('Show error when failed to select platform on overview tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        rejectAddSupportServingPlatformProject: true,
      });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findSelectPlatformButton('single').click();
      projectDetails.findErrorSelectingPlatform().should('exist');
    });

    it('Show error when failed to un-select platform on overview tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: false,
        rejectAddSupportServingPlatformProject: true,
      });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findResetPlatformButton().click();
      projectDetails.findErrorSelectingPlatform().should('exist');
    });
  });

  describe('Navigating back to model registry after selecting a platform', () => {
    it('Navigate back after choosing single-model serving from models tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: false,
      });
      projectDetails.visitSection(
        'test-project',
        'model-server',
        '&modelRegistryName=modelregistry-sample&registeredModelId=1&modelVersionId=2',
      );
      projectDetails.findBackToRegistryButton().click();
      cy.url().should(
        'include',
        '/modelRegistry/modelregistry-sample/registeredModels/1/versions/2',
      );
    });

    it('Navigate back after choosing multi-model serving from models tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: true,
      });
      initModelServingIntercepts();
      projectDetails.visitSection(
        'test-project',
        'model-server',
        '&modelRegistryName=modelregistry-sample&registeredModelId=1&modelVersionId=2',
      );
      projectDetails
        .findDeployModelDropdown()
        .findDropdownItem('Deploy model from model registry')
        .click();
      cy.url().should(
        'include',
        '/modelRegistry/modelregistry-sample/registeredModels/1/versions/2',
      );
    });

    it('Navigate back after choosing NIM serving from the models tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        disableNIMConfig: false,
        enableModelMesh: false,
        enableNIM: true,
      });
      projectDetails.visitSection(
        'test-project',
        'model-server',
        '&modelRegistryName=modelregistry-sample&registeredModelId=1&modelVersionId=2',
      );
      projectDetails.findBackToRegistryButton().click();
      cy.url().should(
        'include',
        '/modelRegistry/modelregistry-sample/registeredModels/1/versions/2',
      );
    });

    it('Navigate back after choosing single-model serving from overview tab after switching tabs', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: false,
      });
      projectDetails.visitSection(
        'test-project',
        'model-server',
        '&modelRegistryName=modelregistry-sample&registeredModelId=1&modelVersionId=2',
      );
      projectDetails.findSectionTab('overview').click();
      projectDetails.findBackToRegistryButton().click();
      cy.url().should(
        'include',
        '/modelRegistry/modelregistry-sample/registeredModels/1/versions/2',
      );
    });

    it('Navigate back after choosing NIM serving from overview tab after switching tabs', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        disableNIMConfig: false,
        enableModelMesh: false,
        enableNIM: true,
      });
      projectDetails.visitSection(
        'test-project',
        'model-server',
        '&modelRegistryName=modelregistry-sample&registeredModelId=1&modelVersionId=2',
      );
      projectDetails.findSectionTab('overview').click();
      projectDetails.findBackToRegistryButton().click();
      cy.url().should(
        'include',
        '/modelRegistry/modelregistry-sample/registeredModels/1/versions/2',
      );
    });
  });

  describe('Workbench disabled', () => {
    beforeEach(() => {
      initIntercepts({
        disableWorkbenches: true,
      });
    });

    it('should hide workbench tab when workbenches are disabled', () => {
      projectDetails.visit('test-project');
      projectDetails.findTab('Workbenches').should('not.exist');
    });

    it('should hide workbench card in overview when workbenches are disabled', () => {
      projectDetails.visitSection('test-project', 'overview');
      cy.get('h2').contains('Workbench').should('not.exist');
    });

    it('should hide workbench references in storage table when workbenches are disabled', () => {
      projectDetails.visitSection('test-project', 'cluster-storages');

      cy.get('th').contains('Connected workbenches').should('not.exist');
    });
  });
});
