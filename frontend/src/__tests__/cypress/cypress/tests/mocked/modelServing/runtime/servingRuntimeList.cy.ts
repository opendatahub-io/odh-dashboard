import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockPodK8sResource } from '#~/__mocks__/mockPodK8sResource';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import {
  mockRouteK8sResource,
  mockRouteK8sResourceModelServing,
} from '#~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import {
  mockServingRuntimeK8sResource,
  mockServingRuntimeK8sResourceLegacy,
} from '#~/__mocks__/mockServingRuntimeK8sResource';
import {
  mockInvalidTemplateK8sResource,
  mockServingRuntimeTemplateK8sResource,
} from '#~/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  modelServingGlobal,
  modelServingSection,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import { projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import type {
  DataScienceClusterKindStatus,
  InferenceServiceKind,
  ServingRuntimeKind,
} from '#~/k8sTypes';
import { ServingRuntimePlatform } from '#~/types';
import { DataScienceStackComponent } from '#~/concepts/areas/types';
import { mockDsciStatus } from '#~/__mocks__/mockDsciStatus';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  ODHDashboardConfigModel,
  PodModel,
  ProjectModel,
  RouteModel,
  SecretModel,
  ServingRuntimeModel,
  TemplateModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import {
  mockGlobalScopedHardwareProfiles,
  mockProjectScopedHardwareProfiles,
} from '#~/__mocks__/mockHardwareProfile';
import { STOP_MODAL_PREFERENCE_KEY } from '#~/pages/modelServing/useStopModalPreference';
import { mockOdhApplication } from '#~/__mocks__/mockOdhApplication';
import { mockNimServingRuntimeTemplate } from '#~/__mocks__/mockNimResource';
import { NamespaceApplicationCase } from '#~/pages/projects/types';

type HandlersProps = {
  disableKServe?: boolean;
  disableKServeAuth?: boolean;
  disableServingRuntimeParams?: boolean;
  disableKServeRaw?: boolean;
  disableKServeMetrics?: boolean;
  disableNIMConfig?: boolean;
  enableNIM?: boolean;
  projectEnableModelMesh?: boolean;
  servingRuntimes?: ServingRuntimeKind[];
  inferenceServices?: InferenceServiceKind[];
  rejectAddSupportServingPlatformProject?: boolean;
  serviceAccountAlreadyExists?: boolean;
  roleBindingAlreadyExists?: boolean;
  roleAlreadyExists?: boolean;
  rejectInferenceService?: boolean;
  rejectServingRuntime?: boolean;
  rejectConnection?: boolean;
  DscComponents?: DataScienceClusterKindStatus['components'];
  disableProjectScoped?: boolean;
  templates?: boolean;
};

const initIntercepts = ({
  disableKServe = false,
  disableKServeMetrics,
  disableKServeAuth,
  disableServingRuntimeParams = true,
  disableKServeRaw = true,
  projectEnableModelMesh,
  disableProjectScoped = true,
  servingRuntimes = [
    mockServingRuntimeK8sResourceLegacy({ tolerations: [], nodeSelector: {} }),
    mockServingRuntimeK8sResource({
      name: 'test-model',
      namespace: 'test-project',
      auth: true,
      route: true,
      tolerations: [],
      nodeSelector: {},
      version: 'v1.0.0',
    }),
  ],
  inferenceServices = [
    mockInferenceServiceK8sResource({ name: 'test-inference' }),
    mockInferenceServiceK8sResource({
      name: 'another-inference-service',
      displayName: 'Another Inference Service',
      deleted: true,
    }),
    mockInferenceServiceK8sResource({
      name: 'llama-caikit',
      displayName: 'Llama Caikit',
      url: 'http://llama-caikit.test-project.svc.cluster.local',
      activeModelState: 'Loaded',
    }),
  ],
  rejectAddSupportServingPlatformProject = false,
  templates = false,
  disableNIMConfig = true,
  enableNIM = false,
  DscComponents,
}: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        ...DscComponents,
      },
    }),
  );
  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableKServe,
      disableKServeAuth,
      disableServingRuntimeParams,
      disableKServeRaw,
      disableProjectScoped,
      disableKServeMetrics,
      disableNIMModelServing: disableNIMConfig,
    }),
  );
  cy.interceptK8s(ODHDashboardConfigModel, mockDashboardConfig({}));
  // mock NIM because the model serving plugin has broader error detection
  cy.interceptOdh('GET /api/components', null, [mockOdhApplication({})]);
  cy.interceptOdh(
    'GET /api/integrations/:internalRoute',
    { path: { internalRoute: 'nim' } },
    {
      isInstalled: !disableNIMConfig,
      isEnabled: !disableNIMConfig,
      canInstall: false,
      error: '',
    },
  );
  cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({})]));
  cy.interceptK8s(RouteModel, mockRouteK8sResource({}));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({
        enableModelMesh: projectEnableModelMesh,
        enableNIM,
      }),
    ]),
  );
  cy.interceptK8s(
    ProjectModel,
    mockProjectK8sResource({
      enableModelMesh: projectEnableModelMesh,
      enableNIM,
    }),
  );
  cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList(inferenceServices));
  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: 'test-project' },
    mockK8sResourceList(inferenceServices),
  );

  cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})]));
  // used by addSupportServingPlatformProject
  cy.interceptOdh(
    'GET /api/namespaces/:namespace/:context',
    { path: { namespace: 'test-project', context: '*' } },
    rejectAddSupportServingPlatformProject ? { statusCode: 401 } : { applied: true },
  ).as('addSupportServingPlatformProject');
  cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList(servingRuntimes));
  cy.interceptK8sList(
    { model: ServingRuntimeModel, ns: 'test-project' },
    mockK8sResourceList(servingRuntimes),
  );

  // Mock hardware profiles
  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(mockGlobalScopedHardwareProfiles),
  ).as('hardwareProfiles');
  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'test-project' },
    mockK8sResourceList(mockProjectScopedHardwareProfiles),
  ).as('hardwareProfiles');

  cy.interceptK8s(
    RouteModel,
    mockRouteK8sResourceModelServing({
      inferenceServiceName: 'test-inference',
      namespace: 'test-project',
    }),
  );
  cy.interceptK8s(
    RouteModel,
    mockRouteK8sResourceModelServing({
      inferenceServiceName: 'another-inference-service',
      namespace: 'test-project',
    }),
  );
  cy.interceptK8s(ServingRuntimeModel, mockServingRuntimeK8sResource({}));
  cy.interceptK8sList(
    { model: TemplateModel, ns: 'opendatahub' },
    mockK8sResourceList([
      ...(templates
        ? [
            mockServingRuntimeTemplateK8sResource({
              name: 'template-2',
              displayName: 'Caikit',
              platforms: [ServingRuntimePlatform.SINGLE],
            }),
            mockServingRuntimeTemplateK8sResource({
              name: 'template-4',
              displayName: 'Serving Runtime with No Annotations',
            }),
            mockInvalidTemplateK8sResource({}),
          ]
        : []),
      ...(!disableNIMConfig ? [mockNimServingRuntimeTemplate()] : []),
    ]),
  ).as('templates');
  if (!disableNIMConfig) {
    cy.interceptK8s(TemplateModel, mockNimServingRuntimeTemplate());
  }
};

describe('Serving Runtime List', () => {
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
  describe('Single model serving platform', () => {
    it('No model serving platform available', () => {
      initIntercepts({
        disableKServe: true,
        inferenceServices: [],
        servingRuntimes: [],
      });

      projectDetails.visitSection('test-project', 'model-server');

      cy.findByText('No model serving platform selected').should('be.visible');
    });

    it('single-model platform is enabled, no serving runtimes templates', () => {
      initIntercepts({
        disableKServe: false,
      });
      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection.findDeployModelButton().should('have.attr', 'aria-disabled');
      modelServingSection.findDeployModelButton().trigger('mouseenter');
      modelServingGlobal.findNoProjectSelectedTooltip().should('exist');
    });

    it('Single model serving platform is enabled', () => {
      initIntercepts({ templates: true, disableKServe: false });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visit('test-project');
      projectDetails.shouldBeEmptyState('Deployments', 'model-server', true);
      projectDetails.findServingPlatformLabel().should('have.text', 'Single-model serving enabled');
    });

    it('Shows KServe metrics only when available', () => {
      initIntercepts({
        templates: true,
        disableKServe: false,
        disableKServeMetrics: true, // Explicitly disable metrics initially
      });

      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection.findModelMetricsLink('Test Inference Service').should('not.exist');

      initIntercepts({
        templates: true,
        disableKServe: false,
        disableKServeMetrics: false,
        inferenceServices: [
          mockInferenceServiceK8sResource({
            activeModelState: 'Loaded',
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection.findModelMetricsLink('Test Inference Service').should('be.visible');
      modelServingSection.findModelMetricsLink('Test Inference Service').click();
      cy.findByTestId('app-page-title').should('have.text', 'Test Inference Service metrics');
    });

    it('Select single-model serving on models tab', () => {
      initIntercepts({
        disableKServe: false,
        disableNIMConfig: false,
      });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'model-server');

      modelServingGlobal.findSingleServingModelButton().click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.KSERVE_PROMOTION}`,
        );
      });
    });

    it('Un-select single-model serving on models tab', () => {
      initIntercepts({
        disableKServe: false,
        disableNIMConfig: false,
        projectEnableModelMesh: false,
        enableNIM: false,
      });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'model-server');

      // Verify that the platform is already selected (should show reset button)
      projectDetails.findResetPlatformButton().should('exist');
      projectDetails.findResetPlatformButton().click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}`,
        );
      });
    });

    it('Show error when failed to select platform on models tab', () => {
      initIntercepts({
        disableKServe: false,
        disableNIMConfig: false,
        rejectAddSupportServingPlatformProject: true,
      });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findSelectPlatformButton('kserve').click();
      projectDetails.findErrorSelectingPlatform().should('exist');
    });

    it('Show error when failed to un-select platform on models tab', () => {
      initIntercepts({
        disableKServe: false,
        disableNIMConfig: false,
        rejectAddSupportServingPlatformProject: true,
        projectEnableModelMesh: false,
        enableNIM: false,
      });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findResetPlatformButton().click();
      projectDetails.findErrorSelectingPlatform().should('exist');
    });

    it('Select single-model serving on overview tab', () => {
      initIntercepts({ disableKServe: false, disableNIMConfig: false });
      initModelServingIntercepts({ isEmpty: true });
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
        disableKServe: false,
        disableNIMConfig: false,
        projectEnableModelMesh: false,
        enableNIM: false,
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
        disableKServe: false,
        disableNIMConfig: false,
        rejectAddSupportServingPlatformProject: true,
      });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'overview');
      projectDetails.findSelectPlatformButton('kserve').click();
      projectDetails.findErrorSelectingPlatform().should('exist');
    });

    it('Show error when failed to un-select platform on overview tab', () => {
      initIntercepts({
        disableKServe: false,
        disableNIMConfig: false,
        rejectAddSupportServingPlatformProject: true,
        projectEnableModelMesh: false,
        enableNIM: false,
      });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'overview');
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
        disableKServe: false,
        disableNIMConfig: false,
        projectEnableModelMesh: false,
        enableNIM: false,
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
        disableKServe: false,
        disableNIMConfig: false,
        projectEnableModelMesh: false,
        enableNIM: false,
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

  describe('Model Serving NIM', () => {
    it('Select NIM serving on models tab', () => {
      initIntercepts({
        disableKServe: false,
        disableNIMConfig: false,
      });
      initModelServingIntercepts({ isEmpty: true });
      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findSelectPlatformButton('nvidia-nim').click();
      cy.wait('@addSupportServingPlatformProject').then((interception) => {
        expect(interception.request.url).to.contain(
          `/api/namespaces/test-project/${NamespaceApplicationCase.KSERVE_NIM_PROMOTION}`,
        );
      });
    });

    it('Un-select NIM serving on models tab', () => {
      initIntercepts({
        disableKServe: false,
        disableNIMConfig: false,
        projectEnableModelMesh: false,
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

    it('Select NIM serving on overview tab', () => {
      initIntercepts({
        disableKServe: false,
        disableNIMConfig: false,
      });
      initModelServingIntercepts({ isEmpty: true });
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
        disableKServe: false,
        disableNIMConfig: false,
        projectEnableModelMesh: false,
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
  });

  describe('KServe', () => {
    it('KServe Model list', () => {
      initIntercepts({
        projectEnableModelMesh: false,
      });
      projectDetails.visitSection('test-project', 'model-server');

      // Check that we get the correct model name
      modelServingSection
        .getKServeRow('Test Inference Service')
        .find()
        .findByText('OpenVINO Serving Runtime (Supports GPUs)')
        .should('exist');
      // Check for resource marked for deletion
      modelServingSection.getKServeRow('Another Inference Service').shouldBeMarkedForDeletion();

      modelServingSection
        .findKServeTableHeaderButton('Model deployment name')
        .should(be.sortAscending);
      modelServingSection.findKServeTableHeaderButton('Model deployment name').click();
      modelServingSection
        .findKServeTableHeaderButton('Model deployment name')
        .should(be.sortDescending);
    });

    it('Stop and start model', () => {
      initIntercepts({
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'test-model',
            displayName: 'test-model',
            modelName: 'test-model',
            activeModelState: 'Loaded',
          }),
        ],
      });
      cy.clearLocalStorage(STOP_MODAL_PREFERENCE_KEY);
      cy.window().then((win) => win.localStorage.setItem(STOP_MODAL_PREFERENCE_KEY, 'false'));
      projectDetails.visitSection('test-project', 'model-server');

      const kserveRow = modelServingSection.getKServeRow('test-model');
      kserveRow.findStatusLabel('Started');

      const stoppedInferenceService = mockInferenceServiceK8sResource({
        name: 'test-model',
        displayName: 'test-model',
        modelName: 'test-model',
        activeModelState: 'Unknown',
      });
      stoppedInferenceService.metadata.annotations = {
        ...stoppedInferenceService.metadata.annotations,
        'serving.kserve.io/stop': 'true',
      };

      cy.intercept(
        'PATCH',
        '/api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices/test-model',
        (req) => {
          expect(req.body).to.deep.include({
            op: 'add',
            path: '/metadata/annotations/serving.kserve.io~1stop',
            value: 'true',
          });
          req.reply(stoppedInferenceService);
        },
      ).as('stopModelPatch');
      cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([stoppedInferenceService])).as(
        'getStoppedModel',
      );

      kserveRow.findStateActionToggle().should('have.text', 'Stop').click();
      kserveRow.findConfirmStopModal().should('exist');
      kserveRow.findConfirmStopModalCheckbox().should('exist');
      kserveRow.findConfirmStopModalCheckbox().should('not.be.checked');
      kserveRow.findConfirmStopModalCheckbox().click();
      kserveRow.findConfirmStopModalCheckbox().should('be.checked');
      kserveRow.findConfirmStopModalButton().click();

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: 'test-project',
          queryParams: { labelSelector: 'serving.kserve.io/inferenceservice=test-model' },
        },
        mockK8sResourceList([]),
      ).as('getPods');

      cy.reload();
      cy.wait(['@stopModelPatch', '@getStoppedModel']);

      kserveRow.findStatusLabel('Stopped');
      kserveRow.findStateActionToggle().should('have.text', 'Start');
      cy.window().then((win) => {
        const preference = win.localStorage.getItem(STOP_MODAL_PREFERENCE_KEY);
        expect(preference).to.equal('true');
      });

      const runningInferenceService = mockInferenceServiceK8sResource({
        name: 'test-model',
        displayName: 'test-model',
        modelName: 'test-model',
        activeModelState: 'Loaded',
      });

      cy.intercept(
        'PATCH',
        '/api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices/test-model',
        (req) => {
          expect(req.body).to.deep.include({
            op: 'add',
            path: '/metadata/annotations/serving.kserve.io~1stop',
            value: 'false',
          });
          req.reply(runningInferenceService);
        },
      ).as('startModelPatch');
      cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([runningInferenceService])).as(
        'getStartedModel',
      );

      kserveRow.findStateActionToggle().should('have.text', 'Start').click();
      cy.reload();
      cy.wait(['@startModelPatch', '@getStartedModel']);
      kserveRow.findStatusLabel('Started');
      kserveRow.findStateActionToggle().should('have.text', 'Stop');
    });

    it('Check number of replicas of model', () => {
      initIntercepts({
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'llama-service',
            displayName: 'Llama Service',
            modelName: 'llama-service',
            minReplicas: 3,
            maxReplicas: 3,
          }),
        ],
        servingRuntimes: [
          mockServingRuntimeK8sResource({
            name: 'llama-service',
            displayName: 'Llama Service',
            namespace: 'test-project',
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');
      const kserveRow = modelServingSection.getKServeRow('Llama Service');
      kserveRow.findExpansion().should(be.collapsed);
      kserveRow.findToggleButton().click();
      kserveRow
        .findDescriptionListItem('Model server replicas')
        .next('dd')
        .should('have.text', '3');
    });
  });

  describe('Check token section in serving runtime details', () => {
    it('Check token section is enabled if capability is enabled', () => {
      initIntercepts({});
      projectDetails.visitSection('test-project', 'model-server');
      const kserveRow = modelServingSection.getKServeRow('Llama Caikit');
      kserveRow.findExpansion().should(be.collapsed);
      kserveRow.findToggleButton().click();
      kserveRow.findDescriptionListItem('Token authentication').should('exist');
    });

    it('Check token section is always available for kserve raw', () => {
      initIntercepts({
        disableKServeRaw: false,
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'llama-caikit',
            displayName: 'Llama Caikit',
            url: 'http://llama-caikit.test-project.svc.cluster.local',
            activeModelState: 'Loaded',
          }),
        ],
      });
      projectDetails.visitSection('test-project', 'model-server');
      const kserveRow = modelServingSection.getKServeRow('Llama Caikit');
      kserveRow.findExpansion().should(be.collapsed);
      kserveRow.findToggleButton().click();
      kserveRow.findDescriptionListItem('Token authentication').should('exist');
    });
  });

  describe('Internal service', () => {
    it('Check internal service is rendered when the model is loaded in Kserve', () => {
      initIntercepts({
        servingRuntimes: [
          mockServingRuntimeK8sResource({
            name: 'test-model',
            auth: true,
            route: false,
          }),
          mockServingRuntimeK8sResource({
            name: 'test-model-not-loaded',
            auth: true,
            route: false,
          }),
        ],
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'model-loaded',
            modelName: 'test-model',
            displayName: 'Loaded model',
            kserveInternalUrl: 'http://test.kserve.svc.cluster.local',
            hasExternalRoute: false,
            activeModelState: 'Loaded',
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');

      // Get modal of inference service when is loaded
      const kserveRowModelLoaded = modelServingSection.getKServeRow('Loaded model');
      kserveRowModelLoaded.findInternalServiceButton().click();
      kserveRowModelLoaded.findInternalServicePopover().findByText('Internal').should('exist');
    });
  });
});
