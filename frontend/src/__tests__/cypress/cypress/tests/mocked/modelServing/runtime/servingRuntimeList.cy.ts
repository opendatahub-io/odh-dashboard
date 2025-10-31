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
import { modelServingSection } from '#~/__tests__/cypress/cypress/pages/modelServing';
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

type HandlersProps = {
  disableKServe?: boolean;
  disableKServeAuth?: boolean;
  disableServingRuntimeParams?: boolean;
  disableKServeRaw?: boolean;
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
};

const initIntercepts = ({
  disableKServe = false,
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
    }),
  );
  cy.interceptK8s(ODHDashboardConfigModel, mockDashboardConfig({}));
  // mock NIM because the model serving plugin has broader error detection
  cy.interceptOdh('GET /api/components', null, [mockOdhApplication({})]);
  cy.interceptOdh(
    'GET /api/integrations/:internalRoute',
    { path: { internalRoute: 'nim' } },
    {
      isInstalled: false,
      isEnabled: false,
      canInstall: false,
      error: '',
    },
  );
  cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({})]));
  cy.interceptK8s(RouteModel, mockRouteK8sResource({}));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: projectEnableModelMesh })]),
  );
  cy.interceptK8s(
    ProjectModel,
    mockProjectK8sResource({ enableModelMesh: projectEnableModelMesh }),
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
  );
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
    TemplateModel,
    mockK8sResourceList(
      [
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
      ],
      { namespace: 'opendatahub' },
    ),
  );
};

describe('Serving Runtime List', () => {
  describe('No serving platform available', () => {
    it('No model serving platform available', () => {
      initIntercepts({
        disableKServe: true,
        inferenceServices: [],
        servingRuntimes: [],
      });

      projectDetails.visitSection('test-project', 'model-server');

      cy.findByText('No model serving platform selected').should('be.visible');
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
