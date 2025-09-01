/* eslint-disable camelcase */
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockDataSciencePipelineApplicationK8sResource } from '#~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockImageStreamK8sResource } from '#~/__mocks__/mockImageStreamK8sResource';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';
import { mockPipelineKF } from '#~/__mocks__/mockPipelineKF';
import { buildMockPipelines } from '#~/__mocks__/mockPipelinesProxy';
import { mockPodK8sResource } from '#~/__mocks__/mockPodK8sResource';
import { mockServiceAccountK8sResource } from '#~/__mocks__/mockServiceAccountK8sResource';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '#~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '#~/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  deleteProjectModal,
  editProjectModal,
  projectDetails,
} from '#~/__tests__/cypress/cypress/pages/projects';
import { ServingRuntimePlatform } from '#~/types';
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
} from '#~/__tests__/cypress/cypress/utils/models';
import { mockServingRuntimeK8sResource } from '#~/__mocks__/mockServingRuntimeK8sResource';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import {
  asProjectAdminUser,
  asProjectEditUser,
} from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { NamespaceApplicationCase } from '#~/pages/projects/types';
import { mockNimServingRuntimeTemplate } from '#~/__mocks__/mockNimResource';
import { mockNimAccount } from '#~/__mocks__/mockNimAccount';
import { mockOdhApplication } from '#~/__mocks__/mockOdhApplication';
import type { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';

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
  namespace?: string;
  disableLlamaStackChatBot?: boolean;
  disableKueue?: boolean;
  inferenceServices?: InferenceServiceKind[];
  servingRuntimes?: ServingRuntimeKind[];
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
  namespace = 'test-project',
  disableLlamaStackChatBot = false,
  disableKueue = true,
  inferenceServices = [],
  servingRuntimes = [],
}: HandlersProps) => {
  cy.interceptK8sList(
    { model: SecretModel, ns: namespace },
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
  ).as('templates');
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
      disableLlamaStackChatBot,
      disableKueue,
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
    { model: PVCModel, ns: namespace },
    mockK8sResourceList(isEmpty ? [] : [mockPVCK8sResource({})]),
  );
  cy.interceptK8s('POST', ServiceAccountModel, {
    statusCode: 200,
    body: mockServiceAccountK8sResource({
      name: 'test-name-sa',
      namespace,
    }),
  });

  cy.interceptK8sList(
    {
      model: ImageStreamModel,
      ns: namespace,
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
    { path: { namespace, context: '*' } },
    rejectAddSupportServingPlatformProject ? { statusCode: 401 } : { applied: true },
  ).as('addSupportServingPlatformProject');
  cy.interceptK8sList(
    { model: NotebookModel, ns: namespace },
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

  cy.interceptOdh('GET /api/components', null, [mockOdhApplication({})]);
  cy.interceptOdh(
    'GET /api/integrations/:internalRoute',
    { path: { internalRoute: 'nim' } },
    {
      isInstalled: true,
      isEnabled: true,
      canInstall: false,
      error: '',
    },
  );
  cy.interceptK8sList(NIMAccountModel, mockK8sResourceList([mockNimAccount({})]));

  cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList(servingRuntimes));
  cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList(inferenceServices));
};

describe('Project Details', () => {
  const servingRuntimes = [mockServingRuntimeK8sResource({})];
  const inferenceServices = [mockInferenceServiceK8sResource({})];
  const initModelServingIntercepts = ({ isEmpty = false }) => {
    if (isEmpty) {
      cy.interceptK8sList(
        {
          model: ServingRuntimeModel,
          ns: 'test-project',
        },
        mockK8sResourceList([], { namespace: 'test-project' }),
      );
      cy.interceptK8sList(
        {
          model: InferenceServiceModel,
          ns: 'test-project',
        },
        mockK8sResourceList([], { namespace: 'test-project' }),
      );
    } else {
      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList(servingRuntimes));
      cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList(inferenceServices));
    }
  };

  describe('Empty project details', () => {
    beforeEach(() => {
      initModelServingIntercepts({});
    });

    it('Empty state component in project details', () => {
      initIntercepts({ isEmpty: true });
      projectDetails.visit('test-project');
      projectDetails.shouldBeEmptyState('Workbenches', 'workbenches', true);
      projectDetails.shouldBeEmptyState('Cluster storage', 'cluster-storages', true);
      projectDetails.shouldBeEmptyState('Pipelines', 'pipelines-projects', true);
    });

    it('shows 403 page when user does not have access to the project', () => {
      asProjectEditUser({ projects: [] });
      cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
      projectDetails.visit('test-project', { wait: false });
      projectDetails.find403Page().should('exist');
    });

    it('shows 403 page with context when pipelines are disabled', () => {
      asProjectEditUser({ projects: [] });
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disablePipelines: true,
        }),
      );
      cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
      projectDetails.visitSection('test-project', 'workbenches');
      projectDetails.find403Page().should('exist');
      projectDetails.findSectionTab('workbenches').should('exist');
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

    it('Should not allow actions toggle for project Edit users', () => {
      asProjectEditUser({ isSelfProvisioner: false });
      initIntercepts({ disableKServeConfig: true, disableModelConfig: true });
      projectDetails.visit('test-project');

      projectDetails.findProjectActions().should('not.exist');
    });

    it('Should allow actions toggle for project Admin users', () => {
      asProjectAdminUser({ isSelfProvisioner: true });
      initIntercepts({ disableKServeConfig: true, disableModelConfig: true });
      projectDetails.visit('test-project');

      projectDetails.findProjectActions().should('exist');
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
      projectDetails.findSelectPlatformButton('kserve').should('exist');
      projectDetails.findSelectPlatformButton('model-mesh').should('exist');
    });

    it('Only single serving platform enabled, no serving runtimes templates', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: true,
      });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'model-server');
      cy.wait('@templates');
      projectDetails.findTopLevelDeployModelButton().should('have.attr', 'aria-disabled');
      projectDetails.findTopLevelDeployModelButton().trigger('mouseenter');
      projectDetails.findDeployModelTooltip().should('exist');
    });

    it('Only multi serving platform enabled, no serving runtimes templates', () => {
      initIntercepts({
        disableKServeConfig: true,
        disableModelConfig: false,
      });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findTopLevelAddModelServerButton().should('have.attr', 'aria-disabled');
      projectDetails.findTopLevelAddModelServerButton().trigger('mouseenter');
      projectDetails.findDeployModelTooltip().should('exist');
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
      projectDetails.findDeployModelTooltip().should('exist');
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
      projectDetails.findDeployModelTooltip().should('exist');
    });

    it('Single model serving platform is enabled', () => {
      initIntercepts({ templates: true, disableKServeConfig: false, disableModelConfig: true });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visit('test-project');
      projectDetails.shouldBeEmptyState('Models', 'model-server', true);
      projectDetails.findServingPlatformLabel().should('have.text', 'Single-model serving enabled');
    });

    it('Shows KServe metrics only when available', () => {
      initIntercepts({ templates: true, disableKServeConfig: false, disableModelConfig: true });

      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.getKserveModelMetricLink('Test Inference Service').should('not.exist');

      initIntercepts({
        templates: true,
        disableKServeConfig: false,
        disableModelConfig: true,
        disableKServeMetrics: false,
        inferenceServices: [
          mockInferenceServiceK8sResource({
            activeModelState: 'Loaded',
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.getKserveModelMetricLink('Test Inference Service').should('be.visible');
      projectDetails.getKserveModelMetricLink('Test Inference Service').click();
      cy.findByTestId('app-page-title').should('have.text', 'Test Inference Service metrics');
    });

    it('Multi model serving platform is enabled', () => {
      initIntercepts({ templates: true, disableKServeConfig: true, disableModelConfig: false });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visit('test-project');
      projectDetails.shouldBeEmptyState('Models', 'model-server', true);

      projectDetails.findServingPlatformLabel().should('have.text', 'Multi-model serving enabled');
    });
  });

  describe('No empty project details', () => {
    beforeEach(() => {
      initModelServingIntercepts({});
    });

    it('No empty state components in the project details', () => {
      initIntercepts({});
      projectDetails.visit('test-project');
      projectDetails.shouldBeEmptyState('Workbenches', 'workbenches', false);
      projectDetails.shouldBeEmptyState('Cluster storage', 'cluster-storages', false);
      projectDetails.shouldBeEmptyState('Pipelines', 'pipelines-projects', false);
    });

    it('Chatbot disabled in the cluster', () => {
      initIntercepts({
        disableLlamaStackChatBot: true,
      });

      projectDetails.visit('test-project');
      cy.findByTestId('chatbot-tab').should('not.exist');
    });

    it('Chatbot enabled in the cluster', () => {
      initIntercepts({
        disableLlamaStackChatBot: false,
      });

      projectDetails.visit('test-project');
      cy.findByTestId('chatbot-tab').should('exist');
      cy.findByRole('tab', { name: 'Chatbot' }).click();
      cy.findByTestId('chatbot').should('exist');
    });

    it('Checks that the chatbot sends messages correctly', () => {
      initIntercepts({
        disableLlamaStackChatBot: false,
      });
      cy.intercept('GET', '/api/llama-stack/models/list', (req) => {
        req.reply({
          statusCode: 200,
          body: [
            {
              identifier: 'all-MiniLM-L6-v2',
              provider_resource_id: 'all-minilm:latest',
              provider_id: 'ollama',
              type: 'model',
              metadata: { embedding_dimension: 384 },
              model_type: 'embedding',
            },
            {
              identifier: 'llama3.2:latest',
              provider_resource_id: 'llama3.2:latest',
              provider_id: 'ollama',
              type: 'model',
              metadata: {},
              model_type: 'llm',
            },
          ],
        });
      }).as('getModels');

      cy.intercept('POST', '/api/llama-stack/chat/complete', (req) => {
        expect(req.body.model_id).to.eq('llama3.2:latest');
        expect(req.body.messages[0].content).to.match(/hello/i);
        req.reply({
          statusCode: 200,
          body: {
            completion_message: {
              role: 'assistant',
              content: 'Hello from bot!',
              stop_reason: 'end_of_turn',
              tool_calls: [],
            },
            metrics: [],
            logprobs: null,
          },
        });
      }).as('sendChatMessage');

      projectDetails.visit('test-project');

      cy.findByTestId('chatbot-tab').click();
      cy.findByTestId('chatbot').should('exist');

      cy.wait('@getModels');

      cy.findByTestId('chatbot-message-bar').should('be.visible').click();
      cy.findByTestId('chatbot-message-bar').type('hello{enter}');

      cy.wait('@sendChatMessage');

      cy.contains('Hello from bot!').should('exist');
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
      initModelServingIntercepts({});
      initIntercepts({ disableKServeConfig: false, disableModelConfig: false });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findSelectPlatformButton('kserve').click();
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
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findResetPlatformButton().click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}`,
        );
      });
    });

    it('Select multi-model serving on models tab', () => {
      initModelServingIntercepts({});
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
      });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findSelectPlatformButton('model-mesh').click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.MODEL_MESH_PROMOTION}`,
        );
      });
    });

    it('Un-select multi-model serving on models tab', () => {
      initModelServingIntercepts({});
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: true,
      });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findResetPlatformButton().click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}`,
        );
      });
    });

    it('Select NIM serving on models tab', () => {
      initModelServingIntercepts({});
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        disableNIMConfig: false,
      });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findSelectPlatformButton('nvidia-nim').click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.KSERVE_NIM_PROMOTION}`,
        );
      });
    });

    it('Un-select NIM serving on models tab', () => {
      initModelServingIntercepts({});
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        disableNIMConfig: false,
        enableModelMesh: false,
        enableNIM: true,
      });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findResetPlatformButton().click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}`,
        );
      });
    });

    it('Show error when failed to select platform on overview tab', () => {
      initModelServingIntercepts({});
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        rejectAddSupportServingPlatformProject: true,
      });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findSelectPlatformButton('kserve').click();
      projectDetails.findErrorSelectingPlatform().should('exist');
    });

    it('Show error when failed to un-select platform on overview tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: false,
        rejectAddSupportServingPlatformProject: true,
      });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findResetPlatformButton().click();
      projectDetails.findErrorSelectingPlatform().should('exist');
    });

    it('Select single-model serving on overview tab', () => {
      initModelServingIntercepts({});
      initIntercepts({ disableKServeConfig: false, disableModelConfig: false });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findSelectPlatformButton('kserve').click();
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
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findResetPlatformButton().click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}`,
        );
      });
    });

    it('Select multi-model serving on overview tab', () => {
      initModelServingIntercepts({});
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
      });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findSelectPlatformButton('model-mesh').click();
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
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findResetPlatformButton().click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}`,
        );
      });
    });

    it('Select NIM serving on overview tab', () => {
      initModelServingIntercepts({});
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        disableNIMConfig: false,
      });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findSelectPlatformButton('nvidia-nim').click();
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
      initModelServingIntercepts({ isEmpty: true });
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
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findSelectPlatformButton('kserve').click();
      projectDetails.findErrorSelectingPlatform().should('exist');
    });

    it('Show error when failed to un-select platform on overview tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: false,
        rejectAddSupportServingPlatformProject: true,
      });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findResetPlatformButton().click();
      projectDetails.findErrorSelectingPlatform().should('exist');
    });

    it('Change serving platform button should be disabled with tooltip when non-dashboard inference service exists', () => {
      // Create a non-dashboard inference service
      const nonDashboardInferenceService = mockInferenceServiceK8sResource({
        name: 'non-dashboard-inference',
        namespace: 'test-project',
        isNonDashboardItem: true,
      });

      initModelServingIntercepts({});
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: false,
        inferenceServices: [nonDashboardInferenceService],
        servingRuntimes: [],
      });

      projectDetails.visitSection('test-project', 'model-server');

      // Find the change serving platform button
      projectDetails.findResetPlatformButton().should('have.attr', 'aria-disabled');

      // Verify the tooltip content
      projectDetails
        .findResetPlatformButton()
        .trigger('mouseenter')
        .then(() => {
          cy.findByRole('tooltip').should(
            'have.text',
            'To change the model serving platform, delete all models and model servers in the project. This project contains models or servers not managed by the dashboard.',
          );
        });
    });

    it('Change serving platform button should be disabled with tooltip when non-dashboard serving runtime exists', () => {
      // Create a non-dashboard inference service
      const nonDashboardInferenceService = mockInferenceServiceK8sResource({
        name: 'non-dashboard-inference',
        namespace: 'test-project',
        isNonDashboardItem: true,
      });
      // Create a non-dashboard serving runtime
      const nonDashboardServingRuntime = mockServingRuntimeK8sResource({
        name: 'non-dashboard-runtime',
        namespace: 'test-project',
        isNonDashboardItem: true,
      });

      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: false,
        inferenceServices: [nonDashboardInferenceService],
        servingRuntimes: [nonDashboardServingRuntime],
      });

      projectDetails.visitSection('test-project', 'model-server');

      // Find the change serving platform button
      projectDetails.findResetPlatformButton().should('have.attr', 'aria-disabled');

      // Verify the tooltip content
      projectDetails
        .findResetPlatformButton()
        .trigger('mouseenter')
        .then(() => {
          cy.findByRole('tooltip').should(
            'have.text',
            'To change the model serving platform, delete all models and model servers in the project. This project contains models or servers not managed by the dashboard.',
          );
        });
    });
  });

  describe('Navigating back to model registry after selecting a platform', () => {
    beforeEach(() => {
      initModelServingIntercepts({});
    });

    it('Navigate back after choosing single-model serving from models tab', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelConfig: false,
        enableModelMesh: false,
      });
      initModelServingIntercepts({ isEmpty: true });
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
      initModelServingIntercepts({ isEmpty: true });
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
      initModelServingIntercepts({ isEmpty: true });
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
      initModelServingIntercepts({ isEmpty: true });
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
      initModelServingIntercepts({});
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

  describe('Kueue disabled for Kueue-enabled project', () => {
    beforeEach(() => {
      initIntercepts({
        disableKueue: true, // Kueue feature flag disabled
        enableModelMesh: false, // Use KServe for model serving
        templates: true, // Enable serving runtime templates
      });
      initModelServingIntercepts({ isEmpty: true });
    });

    it('should show Kueue alert and disable create workbench and deploy model buttons', () => {
      // Create a Kueue-enabled project
      const kueueEnabledProject = mockProjectK8sResource({
        enableModelMesh: false,
      });
      kueueEnabledProject.metadata.labels = {
        ...kueueEnabledProject.metadata.labels,
        'kueue.openshift.io/managed': 'true', // Make project Kueue-enabled
      };

      cy.interceptK8s(ProjectModel, kueueEnabledProject);
      cy.interceptK8sList(ProjectModel, mockK8sResourceList([kueueEnabledProject]));

      projectDetails.visit('test-project');

      // 1. Verify Kueue alert is displayed
      cy.findByTestId('kueue-disabled-alert-project-details').should('be.visible');

      // 2. Verify create workbench button is disabled
      projectDetails.visitSection('test-project', 'workbenches');
      cy.findByTestId('create-workbench-button').should('have.attr', 'aria-disabled', 'true');

      // 3. Verify deploy model button is disabled
      projectDetails.visitSection('test-project', 'model-server');
      cy.findByTestId('deploy-button').should('have.attr', 'aria-disabled', 'true');
    });
  });
});
