import {
  mockAcceleratorProfile,
  mockProjectScopedAcceleratorProfiles,
} from '#~/__mocks__/mockAcceleratorProfile';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mock200Status, mock404Error, mock409Error } from '#~/__mocks__/mockK8sStatus';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';
import { mockPodK8sResource } from '#~/__mocks__/mockPodK8sResource';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockRoleBindingK8sResource } from '#~/__mocks__/mockRoleBindingK8sResource';
import {
  mockRouteK8sResource,
  mockRouteK8sResourceModelServing,
} from '#~/__mocks__/mockRouteK8sResource';
import {
  mockCustomSecretK8sResource,
  mockSecretK8sResource,
} from '#~/__mocks__/mockSecretK8sResource';
import { mockServiceAccountK8sResource } from '#~/__mocks__/mockServiceAccountK8sResource';
import {
  mockServingRuntimeK8sResource,
  mockServingRuntimeK8sResourceLegacy,
} from '#~/__mocks__/mockServingRuntimeK8sResource';
import {
  mockInvalidTemplateK8sResource,
  mockServingRuntimeTemplateK8sResource,
} from '#~/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  createServingRuntimeModal,
  editServingRuntimeModal,
  inferenceServiceModal,
  inferenceServiceModalEdit,
  kserveModal,
  kserveModalEdit,
  modelServingSection,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import { projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import type {
  DataScienceClusterKindStatus,
  InferenceServiceKind,
  ServingRuntimeKind,
} from '#~/k8sTypes';
import { DeploymentMode } from '#~/k8sTypes';
import { ServingRuntimePlatform, TolerationEffect, TolerationOperator } from '#~/types';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { StackCapability } from '#~/concepts/areas/types';
import { mockDsciStatus } from '#~/__mocks__/mockDsciStatus';
import {
  AcceleratorProfileModel,
  HardwareProfileModel,
  InferenceServiceModel,
  NotebookModel,
  ODHDashboardConfigModel,
  PVCModel,
  PodModel,
  ProjectModel,
  RoleBindingModel,
  RoleModel,
  RouteModel,
  SecretModel,
  ServiceAccountModel,
  ServingRuntimeModel,
  TemplateModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { mockRoleK8sResource } from '#~/__mocks__/mockRoleK8sResource';
import { mockConnectionTypeConfigMap } from '#~/__mocks__/mockConnectionType';
import {
  mockGlobalScopedHardwareProfiles,
  mockProjectScopedHardwareProfiles,
} from '#~/__mocks__/mockHardwareProfile';
import { hardwareProfileSection } from '#~/__tests__/cypress/cypress/pages/components/HardwareProfileSection';
import { acceleratorProfileSection } from '#~/__tests__/cypress/cypress/pages/components/subComponents/AcceleratorProfileSection';

type HandlersProps = {
  disableKServeConfig?: boolean;
  disableKServeAuthConfig?: boolean;
  disableServingRuntimeParams?: boolean;
  disableModelMeshConfig?: boolean;
  disableAccelerator?: boolean;
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
  requiredCapabilities?: StackCapability[];
  DscComponents?: DataScienceClusterKindStatus['components'];
  disableProjectScoped?: boolean;
  disableHardwareProfiles?: boolean;
};
import { STOP_MODAL_PREFERENCE_KEY } from '#~/pages/modelServing/useStopModalPreference';

const initIntercepts = ({
  disableKServeConfig,
  disableKServeAuthConfig,
  disableServingRuntimeParams = true,
  disableModelMeshConfig,
  disableAccelerator,
  disableKServeRaw = true,
  projectEnableModelMesh,
  disableProjectScoped = true,
  disableHardwareProfiles = true,
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
  serviceAccountAlreadyExists = false,
  roleBindingAlreadyExists = false,
  roleAlreadyExists = false,
  rejectInferenceService = false,
  rejectServingRuntime = false,
  rejectConnection = false,
  requiredCapabilities = [],
  DscComponents,
}: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: DscComponents,
      installedComponents: { kserve: true, 'model-mesh': true },
    }),
  );
  cy.interceptOdh(
    'GET /api/dsci/status',
    mockDsciStatus({
      requiredCapabilities,
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableKServe: disableKServeConfig,
      disableModelMesh: disableModelMeshConfig,
      disableKServeAuth: disableKServeAuthConfig,
      disableServingRuntimeParams,
      disableKServeRaw,
      disableProjectScoped,
      disableHardwareProfiles,
    }),
  );
  cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({})]));
  cy.interceptK8s(RouteModel, mockRouteK8sResource({}));
  cy.interceptK8sList(NotebookModel, mockK8sResourceList([mockNotebookK8sResource({})]));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: projectEnableModelMesh })]),
  );
  cy.interceptK8sList(PVCModel, mockK8sResourceList([mockPVCK8sResource({})]));
  cy.interceptK8s(
    ProjectModel,
    mockProjectK8sResource({ enableModelMesh: projectEnableModelMesh }),
  );
  cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList(inferenceServices));
  cy.interceptK8s(
    'POST',
    {
      model: InferenceServiceModel,
      ns: 'test-project',
    },
    rejectInferenceService
      ? { statusCode: 404 }
      : {
          statusCode: 200,
          body: mockInferenceServiceK8sResource({ name: 'test-inference' }),
        },
  ).as('createInferenceService');
  cy.interceptK8s(
    'PUT',
    InferenceServiceModel,
    mockInferenceServiceK8sResource({ name: 'llama-service' }),
  );
  cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})]));
  // used by addSupportServingPlatformProject
  cy.interceptOdh(
    'GET /api/namespaces/:namespace/:context',
    { path: { namespace: 'test-project', context: '*' } },
    rejectAddSupportServingPlatformProject ? { statusCode: 401 } : { applied: true },
  );
  cy.interceptK8s(
    {
      model: ServiceAccountModel,
      ns: 'test-project',
      name: 'test-name-sa',
    },
    serviceAccountAlreadyExists
      ? {
          statusCode: 200,
          body: mockServiceAccountK8sResource({
            name: 'test-name-sa',
            namespace: 'test-project',
          }),
        }
      : { statusCode: 404, body: mock404Error({}) },
  );
  cy.interceptK8s(
    'POST',
    {
      model: ServiceAccountModel,
      ns: 'test-project',
    },
    serviceAccountAlreadyExists
      ? { statusCode: 409, body: mock409Error({}) }
      : {
          statusCode: 200,
          body: mockServiceAccountK8sResource({
            name: 'test-name-sa',
            namespace: 'test-project',
          }),
        },
  ).as('createServiceAccount');
  cy.interceptK8s(
    {
      model: RoleBindingModel,
      ns: 'test-project',
      name: 'test-name-view',
    },
    roleBindingAlreadyExists
      ? {
          statusCode: 200,
          body: mockRoleBindingK8sResource({
            name: 'test-name-view',
            namespace: 'test-project',
          }),
        }
      : { statusCode: 404, body: mock404Error({}) },
  );
  cy.interceptK8s(
    'POST',
    {
      model: RoleBindingModel,
      ns: 'test-project',
    },
    roleBindingAlreadyExists
      ? { statusCode: 409, body: mock409Error({}) }
      : {
          statusCode: 200,
          body: mockRoleBindingK8sResource({
            name: 'test-name-view',
            namespace: 'test-project',
          }),
        },
  ).as('createRoleBinding');
  cy.interceptK8s(
    {
      model: RoleModel,
      ns: 'test-project',
      name: 'test-name-view-role',
    },
    roleAlreadyExists
      ? {
          statusCode: 200,
          body: mockRoleK8sResource({
            name: 'test-name-view-role',
            namespace: 'test-project',
          }),
        }
      : { statusCode: 404, body: mock404Error({}) },
  );
  cy.interceptK8s(
    'POST',
    {
      model: RoleModel,
      ns: 'test-project',
    },
    roleAlreadyExists
      ? { statusCode: 409, body: mock409Error({}) }
      : {
          statusCode: 200,
          body: mockRoleK8sResource({
            name: 'test-name-view',
            namespace: 'test-project',
          }),
        },
  ).as('createRole');
  cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList(servingRuntimes));

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
    'POST',
    {
      model: ServingRuntimeModel,
      ns: 'test-project',
    },
    rejectServingRuntime
      ? { statusCode: 401 }
      : {
          statusCode: 200,
          body: mockServingRuntimeK8sResource({
            name: 'test-model',
            namespace: 'test-project',
            auth: true,
            route: true,
          }),
        },
  ).as('createServingRuntime');
  cy.interceptK8s(
    'PUT',
    ServingRuntimeModel,
    mockServingRuntimeK8sResource({
      name: 'llama-service',
      namespace: 'test-project',
    }),
  ).as('updateServingRuntime');
  cy.interceptK8s(
    'PUT',
    InferenceServiceModel,
    mockInferenceServiceK8sResource({
      name: 'llama-service',
      displayName: 'Llama Service',
      modelName: 'llama-service',
      isModelMesh: false,
      args: ['--arg=value1'],
      env: [{ name: 'test-name1', value: 'test-value' }],
    }),
  ).as('updateInferenceService');
  cy.interceptK8s(ODHDashboardConfigModel, mockDashboardConfig({}));
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
  cy.interceptK8s(
    'PUT',
    ServingRuntimeModel,
    mockServingRuntimeK8sResource({ name: 'test-model-legacy' }),
  ).as('editModelServer');
  cy.interceptK8sList(
    AcceleratorProfileModel,
    mockK8sResourceList([
      mockAcceleratorProfile({
        name: 'migrated-gpu',
        namespace: 'opendatahub',
        displayName: 'NVIDIA GPU',
        enabled: !disableAccelerator,
        identifier: 'nvidia.com/gpu',
        description: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Saepe, quis',
      }),
      mockAcceleratorProfile({
        name: 'small-profile',
        displayName: 'Small Profile',
        namespace: 'test-project',
        enabled: !disableAccelerator,
        tolerations: [
          {
            effect: TolerationEffect.NO_SCHEDULE,
            key: 'NotebooksOnlyChange',
            operator: TolerationOperator.EXISTS,
          },
        ],
      }),
    ]),
  );
  cy.interceptK8sList(
    TemplateModel,
    mockK8sResourceList(
      [
        mockServingRuntimeTemplateK8sResource({
          name: 'template-1',
          displayName: 'Multi Platform',
          platforms: [ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-2',
          displayName: 'Caikit',
          platforms: [ServingRuntimePlatform.SINGLE],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-3',
          displayName: 'New OVMS Server',
          platforms: [ServingRuntimePlatform.MULTI],
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

  cy.interceptK8s(
    'POST',
    {
      model: SecretModel,
      ns: 'test-project',
    },
    rejectConnection
      ? { statusCode: 401 }
      : {
          statusCode: 200,
          body: mockSecretK8sResource({}),
        },
  ).as('createConnectionSecret');

  cy.interceptOdh('GET /api/connection-types', [
    mockConnectionTypeConfigMap({
      displayName: 'URI - v1',
      name: 'uri-v1',
      category: ['existing-category'],
      fields: [
        {
          type: 'uri',
          name: 'URI field test',
          envVar: 'URI',
          required: true,
          properties: {},
        },
      ],
    }),
  ]).as('getConnectionTypes');
};

describe('Serving Runtime List', () => {
  describe('Change button visiblity', () => {
    it('Change button visible when current platform is disabled', () => {
      // starts with modelMesh enabled and kServe disabled
      initIntercepts({
        disableModelMeshConfig: false,
        disableKServeConfig: true,
        servingRuntimes: [],
        projectEnableModelMesh: true,
      });
      projectDetails.visitSection('test-project', 'model-server');
      // shouldn't exist because kServe is disabled and theres nothing to change to
      projectDetails.findResetPlatformButton().should('not.exist');
      // simulate modelMesh being disabled
      cy.interceptOdh(
        'GET /api/dsc/status',
        mockDscStatus({
          components: undefined,
          installedComponents: { kserve: false, 'model-mesh': false },
        }),
      );

      cy.reload();
      projectDetails.findResetPlatformButton().should('exist');
    });
  });
  describe('No server available', () => {
    it('No model serving platform available', () => {
      initIntercepts({
        disableModelMeshConfig: true,
        disableKServeConfig: true,
        servingRuntimes: [],
      });

      projectDetails.visitSection('test-project', 'model-server');

      cy.findByText('No model serving platform selected').should('be.visible');
    });
  });

  describe('ModelMesh', () => {
    it('Deploy ModelMesh model', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        inferenceServices: [
          mockInferenceServiceK8sResource({ name: 'test-inference', isModelMesh: true }),
          mockInferenceServiceK8sResource({
            name: 'another-inference-service',
            displayName: 'Another Inference Service',
            deleted: true,
            isModelMesh: true,
          }),
          mockInferenceServiceK8sResource({
            name: 'ovms-testing',
            displayName: 'OVMS ONNX',
            isModelMesh: true,
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.getModelMeshRow('ovms').findDeployModelButton().click();

      inferenceServiceModal.shouldBeOpen();

      // test that you can not submit on empty
      inferenceServiceModal.findSubmitButton().should('be.disabled');

      // test filling in minimum required fields
      inferenceServiceModal.findModelNameInput().type('Test Name');
      inferenceServiceModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      inferenceServiceModal.findSubmitButton().should('be.disabled');
      inferenceServiceModal.findNewConnectionOption().click();
      inferenceServiceModal.findConnectionNameInput().type('Test Name');
      inferenceServiceModal.findConnectionFieldInput('URI').type('https://test');
      inferenceServiceModal.findSubmitButton().should('be.enabled');
      inferenceServiceModal.findExistingConnectionOption().click();
      inferenceServiceModal.findExistingConnectionSelect().should('have.attr', 'disabled');
      inferenceServiceModal.findLocationPathInput().type('test-model/');
      inferenceServiceModal.findSubmitButton().should('be.enabled');

      // test invalid resource name
      inferenceServiceModal.k8sNameDescription.findResourceEditLink().click();
      inferenceServiceModal.k8sNameDescription
        .findResourceNameInput()
        .should('have.attr', 'aria-invalid', 'false');
      inferenceServiceModal.k8sNameDescription
        .findResourceNameInput()
        .should('have.value', 'test-name');
      // Invalid character k8s names fail
      inferenceServiceModal.k8sNameDescription
        .findResourceNameInput()
        .clear()
        .type('InVaLiD vAlUe!');
      inferenceServiceModal.k8sNameDescription
        .findResourceNameInput()
        .should('have.attr', 'aria-invalid', 'true');
      inferenceServiceModal.findSubmitButton().should('be.disabled');
      inferenceServiceModal.k8sNameDescription.findResourceNameInput().clear().type('test-name');
      inferenceServiceModal.findSubmitButton().should('be.enabled');

      inferenceServiceModal.findSubmitButton().click();

      // dry run request
      cy.wait('@createInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          metadata: {
            name: 'test-name',
            namespace: 'test-project',
            labels: { 'opendatahub.io/dashboard': 'true' },
            annotations: {
              'openshift.io/display-name': 'Test Name',
              'serving.kserve.io/deploymentMode': DeploymentMode.ModelMesh,
            },
          },
          spec: {
            predictor: {
              model: {
                modelFormat: { name: 'onnx', version: '1' },
                runtime: 'test-model-legacy',
                storage: { key: 'test-secret', path: 'test-model/' },
              },
            },
          },
        });
      });

      // Actual request
      cy.wait('@createInferenceService').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      cy.get('@createInferenceService.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });
    });

    it('Edit ModelMesh model', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'ovms-testing',
            displayName: 'OVMS ONNX',
            isModelMesh: true,
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection
        .getModelMeshRow('OVMS Model Serving')
        .findDeployedModelExpansionButton()
        .click();
      modelServingSection.getInferenceServiceRow('OVMS ONNX').findKebabAction('Edit').click();
      inferenceServiceModalEdit.shouldBeOpen();
      inferenceServiceModalEdit
        .findServingRuntimeSelect()
        .should('have.text', 'OVMS Model Serving')
        .should('be.enabled');
      inferenceServiceModalEdit.findExistingConnectionSelect().should('have.attr', 'disabled');
      inferenceServiceModalEdit
        .findExistingConnectionSelect()
        .findByRole('combobox')
        .should('have.value', 'Test Secret');
    });

    it('ModelMesh ServingRuntime list', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        inferenceServices: [
          mockInferenceServiceK8sResource({ name: 'test-inference', isModelMesh: true }),
          mockInferenceServiceK8sResource({
            name: 'another-inference-service',
            displayName: 'Another Inference Service',
            statusPredictor: {
              grpcUrl: 'grpc://modelmesh-serving.app:8033',
              restUrl: 'http:///modelmesh-serving.app:8000',
            },
            deleted: true,
            isModelMesh: true,
          }),
          mockInferenceServiceK8sResource({
            name: 'ovms-testing',
            displayName: 'OVMS ONNX',
            activeModelState: 'FailedToLoad',
            isModelMesh: true,
            lastFailureInfoMessage: 'Failed to pull model from storage due to error',
          }),
          mockInferenceServiceK8sResource({
            name: 'loaded-model',
            displayName: 'Loaded model',
            activeModelState: 'Loaded',
            isModelMesh: true,
            lastFailureInfoMessage: 'Failed to pull model from storage due to error',
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');

      // Check that the legacy serving runtime is shown with the default runtime name
      modelServingSection.getModelMeshRow('ovms').find().should('exist');
      // Check that the legacy serving runtime displays the correct Serving Runtime
      modelServingSection.getModelMeshRow('ovms').shouldHaveServingRuntime('OpenVINO Model Server');
      // Check that the legacy serving runtime has tokens disabled
      modelServingSection.getModelMeshRow('ovms').shouldHaveTokens(false);

      modelServingSection.getModelMeshRow('ovms').findExpansion().should(be.collapsed);
      modelServingSection.getModelMeshRow('ovms').findExpandButton().click();
      modelServingSection.getModelMeshRow('ovms').findExpansion().should(be.expanded);

      // Check that the serving runtime is shown with the default runtime name
      modelServingSection.getModelMeshRow('OVMS Model Serving').find().should('exist');
      // Check that the serving runtime displays the correct Serving Runtime
      modelServingSection
        .getModelMeshRow('OVMS Model Serving')
        .shouldHaveServingRuntime('OpenVINO Serving Runtime (Supports GPUs)');

      // Check status of deployed model
      modelServingSection
        .getModelMeshRow('OVMS Model Serving')
        .findDeployedModelExpansionButton()
        .click();
      modelServingSection.findInferenceServiceTable().should('exist');
      let inferenceServiceRow = modelServingSection.getInferenceServiceRow('OVMS ONNX');
      inferenceServiceRow.findStatusLabel('Failed');
      inferenceServiceRow.findStatusTooltip();
      inferenceServiceRow.findStatusTooltipValue('Failed to pull model from storage due to error');

      // Check status of deployed model which loaded successfully after an error
      inferenceServiceRow = modelServingSection.getInferenceServiceRow('Loaded model');
      inferenceServiceRow.findStatusLabel('Running');
      inferenceServiceRow.findStatusTooltip().should('be.visible');
      inferenceServiceRow.findStatusTooltipValue('Loaded');

      // Check API protocol in row
      inferenceServiceRow.findAPIProtocol().should('have.text', 'REST');

      // sort by modelName
      modelServingSection
        .findInferenceServiceTableHeaderButton('Model deployment name')
        .should(be.sortAscending);
      modelServingSection.findInferenceServiceTableHeaderButton('Model deployment name').click();
      modelServingSection
        .findInferenceServiceTableHeaderButton('Model deployment name')
        .should(be.sortDescending);
    });

    it('modelmesh inference endpoints when external route is enabled', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'another-inference-service',
            displayName: 'Another Inference Service',
            statusPredictor: {
              grpcUrl: 'grpc://modelmesh-serving.app:8033',
              restUtl: 'http:///modelmesh-serving.app:8000',
            },
            deleted: true,
            isModelMesh: true,
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection
        .getModelMeshRow('OVMS Model Serving')
        .findDeployedModelExpansionButton()
        .click();
      const inferenceServiceRow = modelServingSection.getInferenceServiceRow(
        'Another Inference Service',
      );
      inferenceServiceRow.findExternalServiceButton().click();
      inferenceServiceRow
        .findExternalServicePopover()
        .findByText('Internal (can only be accessed from inside the cluster)')
        .should('exist');
      inferenceServiceRow
        .findExternalServicePopover()
        .findByText('grpc://modelmesh-serving.app:8033')
        .should('exist');
      inferenceServiceRow
        .findExternalServicePopover()
        .findByText('http:///modelmesh-serving.app:8000')
        .should('exist');
      inferenceServiceRow
        .findExternalServicePopover()
        .findByText('External (can be accessed from inside or outside the cluster)')
        .should('exist');
      inferenceServiceRow
        .findExternalServicePopover()
        .findByText('https://another-inference-service-test-project.apps.user.com/infer')
        .should('exist');
    });

    it('Display only project scoped label on deployments table', () => {
      initIntercepts({
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableProjectScoped: false,
        servingRuntimes: [
          mockServingRuntimeK8sResource({
            isProjectScoped: true,
            scope: 'project',
            templateDisplayName: 'test-project-scoped-sr',
          }),
        ],
        inferenceServices: [
          mockInferenceServiceK8sResource({ displayName: 'Test Inference Service' }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection
        .getKServeRow('Test Inference Service')
        .find()
        .findByText('test-project-scoped-sr')
        .should('exist');

      modelServingSection
        .getKServeRow('Test Inference Service')
        .findProjectScopedLabel()
        .should('exist');
    });

    it('modelmesh inference endpoints when external route is not enabled', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'another-inference-service',
            displayName: 'Another Inference Service',
            statusPredictor: {
              grpcUrl: 'grpc://modelmesh-serving.app:8033',
              restUtl: 'http:///modelmesh-serving.app:8000',
            },
            deleted: true,
            isModelMesh: true,
          }),
        ],
        servingRuntimes: [
          mockServingRuntimeK8sResourceLegacy({}),
          mockServingRuntimeK8sResource({
            name: 'test-model',
            namespace: 'test-project',
            auth: true,
            route: false,
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection
        .getModelMeshRow('OVMS Model Serving')
        .findDeployedModelExpansionButton()
        .click();
      const inferenceServiceRow = modelServingSection.getInferenceServiceRow(
        'Another Inference Service',
      );
      inferenceServiceRow.findInternalServiceButton().click();
      inferenceServiceRow
        .findInternalServicePopover()
        .findByText('Internal (can only be accessed from inside the cluster)')
        .should('exist');
      inferenceServiceRow
        .findInternalServicePopover()
        .findByText('grpc://modelmesh-serving.app:8033')
        .should('exist');
      inferenceServiceRow
        .findInternalServicePopover()
        .findByText('http:///modelmesh-serving.app:8000')
        .should('exist');
    });
  });

  describe('KServe', () => {
    it('Deploy KServe model', () => {
      initIntercepts({
        disableModelMeshConfig: false,
        disableKServeConfig: false,
        disableServingRuntimeParams: false,
        servingRuntimes: [],
        requiredCapabilities: [StackCapability.SERVICE_MESH, StackCapability.SERVICE_MESH_AUTHZ],
        projectEnableModelMesh: false,
      });

      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findDeployModelButton().click();

      kserveModal.shouldBeOpen();

      // test that you can not submit on empty
      kserveModal.findSubmitButton().should('be.disabled');

      // test filling in minimum required fields
      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateSearchSelector().click();
      kserveModal.findGlobalScopedTemplateOption('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      kserveModal.findSubmitButton().should('be.disabled');
      // check external route, token should be checked and no alert
      kserveModal.findAuthenticationCheckbox().check();
      kserveModal.findExternalRouteError().should('not.exist');
      kserveModal.findServiceAccountNameInput().should('have.value', 'default-name');
      kserveModal.findSubmitButton().should('be.disabled');
      kserveModal.findNewConnectionOption().click();
      kserveModal.findConnectionNameInput().type('Test Name');
      kserveModal.findConnectionFieldInput('URI').type('https://test');
      kserveModal.findSubmitButton().should('be.enabled');
      kserveModal.findExistingConnectionOption().click();
      kserveModal.findExistingConnectionSelect().should('have.attr', 'disabled');
      kserveModal
        .findExistingConnectionSelect()
        .findByRole('combobox')
        .should('have.value', 'Test Secret');
      kserveModal.findLocationPathInput().type('test-model/');
      kserveModal.findSubmitButton().should('be.enabled');
      kserveModal.findConfigurationParamsSection().should('exist');
      kserveModal.findServingRuntimeArgumentsSectionInput().type('--arg=value');
      kserveModal.findServingRuntimeEnvVarsSectionAddButton().click();
      kserveModal.findServingRuntimeEnvVarsName('0').type('test-name');
      kserveModal.findServingRuntimeEnvVarsValue('0').type('test-value');

      // Checking model server custom size input min/max values
      kserveModal.findModelServerSizeSelect().findSelectOption('Custom').click();

      kserveModal.findCPURequestedInput().clear().type('1');
      kserveModal.findCPULimitInput().clear().type('1');
      kserveModal.findMemoryRequestedInput().clear().type('1');
      kserveModal.findMemoryLimitInput().clear().type('1');
      kserveModal.findCPURequestedButton('Minus').should('be.disabled');
      kserveModal.findCPULimitButton('Minus').should('be.disabled');
      kserveModal.findMemoryRequestedButton('Minus').should('be.disabled');
      kserveModal.findMemoryLimitButton('Minus').should('be.disabled');

      kserveModal.findCPURequestedButton('Plus').should('be.disabled');
      kserveModal.findCPULimitButton('Plus').click();
      kserveModal.findCPURequestedButton('Plus').should('be.enabled');
      kserveModal.findMemoryRequestedButton('Plus').should('be.disabled');
      kserveModal.findMemoryLimitButton('Plus').click();
      kserveModal.findMemoryRequestedButton('Plus').should('be.enabled');

      kserveModal.findMemoryRequestedInput().clear().type('3');
      kserveModal.findMemoryRequestedInput().should('have.value', '2');
      kserveModal.findCPURequestedInput().clear().type('3');
      kserveModal.findCPURequestedInput().should('have.value', '2');

      kserveModal.findCPULimitInput().clear().type('1');
      kserveModal.findCPULimitInput().should('have.value', '2');
      kserveModal.findMemoryLimitInput().clear().type('1');
      kserveModal.findMemoryLimitInput().should('have.value', '2');

      kserveModal.findModelServerSizeSelect().findSelectOption(/Small/).click();
      kserveModal.findSubmitButton().should('be.enabled');

      // test submitting form, the modal should close to indicate success.
      kserveModal.findSubmitButton().click();
      kserveModal.shouldBeOpen(false);

      // dry run request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          metadata: {
            name: 'test-name',
            annotations: {
              'openshift.io/display-name': 'test-name',
              'opendatahub.io/apiProtocol': 'REST',
              'opendatahub.io/template-name': 'template-2',
              'opendatahub.io/template-display-name': 'Caikit',
              'opendatahub.io/accelerator-name': '',
            },
            namespace: 'test-project',
          },
          spec: {
            protocolVersions: ['grpc-v1'],
            supportedModelFormats: [
              { autoSelect: true, name: 'openvino_ir', version: 'opset1' },
              { autoSelect: true, name: 'onnx', version: '1' },
            ],
          },
        });
      });

      // Actual request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      // the serving runtime should have been created
      cy.get('@createServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });

      cy.wait('@createInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          apiVersion: 'serving.kserve.io/v1beta1',
          kind: 'InferenceService',
          metadata: {
            name: 'test-name',
            namespace: 'test-project',
            labels: {
              'opendatahub.io/dashboard': 'true',
              'networking.knative.dev/visibility': 'cluster-local',
            },
            annotations: {
              'openshift.io/display-name': 'Test Name',
              'serving.knative.openshift.io/enablePassthrough': 'true',
              'sidecar.istio.io/inject': 'true',
              'sidecar.istio.io/rewriteAppHTTPProbers': 'true',
              'security.opendatahub.io/enable-auth': 'true',
            },
          },
          spec: {
            predictor: {
              minReplicas: 1,
              maxReplicas: 1,
              model: {
                modelFormat: { name: 'onnx', version: '1' },
                runtime: 'test-name',
                storage: { key: 'test-secret', path: 'test-model/' },
                args: ['--arg=value'],
                env: [{ name: 'test-name', value: 'test-value' }],
                resources: {
                  requests: { cpu: '1', memory: '4Gi' },
                  limits: { cpu: '2', memory: '8Gi' },
                },
              },
            },
          },
        });
      });

      //dry run request
      cy.wait('@createRole').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          metadata: {
            name: 'test-name-view-role',
            namespace: 'test-project',
            ownerReferences: [],
          },
          rules: [
            {
              verbs: ['get'],
              apiGroups: ['serving.kserve.io'],
              resources: ['inferenceservices'],
              resourceNames: ['test-name'],
            },
          ],
        });
      });

      //Actual request
      cy.wait('@createRole').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      cy.get('@createRole.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); //1 dry run request and 1 actual request
      });
    });

    it('Kserve auth should be hidden when auth is disabled', () => {
      initIntercepts({
        disableModelMeshConfig: false,
        disableKServeConfig: false,
        disableKServeAuthConfig: true,
        servingRuntimes: [],
        projectEnableModelMesh: false,
      });

      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findDeployModelButton().click();

      kserveModal.shouldBeOpen();

      // test that you can not submit on empty
      kserveModal.findSubmitButton().should('be.disabled');

      // test filling in minimum required fields
      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateSearchSelector().click();
      kserveModal.findGlobalScopedTemplateOption('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      kserveModal.findSubmitButton().should('be.disabled');
      // check external route, token should be checked and no alert
      kserveModal.findAuthenticationCheckbox().should('not.exist');
    });

    it('show warning alert on modal, when authorino operator is not installed/enabled', () => {
      initIntercepts({
        disableModelMeshConfig: false,
        disableKServeConfig: false,
        disableKServeAuthConfig: false,
        servingRuntimes: [],
        projectEnableModelMesh: false,
      });

      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findDeployModelButton().click();

      kserveModal.shouldBeOpen();
      kserveModal.findAuthorinoNotEnabledAlert().should('exist');
      kserveModal.findModelRouteCheckbox().should('not.be.checked');
      kserveModal.findModelRouteCheckbox().check();
      kserveModal.findTokenAuthAlert().should('exist');
      kserveModal.findModelRouteCheckbox().uncheck();
      kserveModal.findTokenAuthAlert().should('not.exist');
    });

    it('Kserve auth should be hidden when no required capabilities', () => {
      initIntercepts({
        disableModelMeshConfig: false,
        disableKServeConfig: false,
        disableKServeAuthConfig: false,
        servingRuntimes: [],
        requiredCapabilities: [],
        projectEnableModelMesh: false,
      });

      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findDeployModelButton().click();

      kserveModal.shouldBeOpen();

      // check external route, token should be checked and no alert
      kserveModal.findAuthenticationCheckbox().should('not.exist');
    });

    it('Kserve auth should be enabled if capabilities are prsent', () => {
      initIntercepts({
        disableModelMeshConfig: false,
        disableKServeConfig: false,
        disableKServeAuthConfig: false,
        servingRuntimes: [],
        requiredCapabilities: [StackCapability.SERVICE_MESH, StackCapability.SERVICE_MESH_AUTHZ],
        projectEnableModelMesh: false,
      });

      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findDeployModelButton().click();

      kserveModal.shouldBeOpen();

      // check external route, token should be checked and no alert
      kserveModal.findAuthenticationCheckbox().should('exist');
    });

    it('Do not deploy KServe model when user cannot edit namespace (only one serving platform enabled)', () => {
      // If only one platform is enabled, project platform selection has not happened yet and patching the namespace with the platform happens at deploy time.
      initIntercepts({
        disableModelMeshConfig: true,
        disableKServeConfig: false,
        servingRuntimes: [],
        rejectAddSupportServingPlatformProject: true,
      });

      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findDeployModelButton().click();

      kserveModal.shouldBeOpen();

      // test filling in minimum required fields
      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateSearchSelector().click();
      kserveModal.findGlobalScopedTemplateOption('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      kserveModal.findExistingConnectionSelect().should('have.attr', 'disabled');
      kserveModal.findNewConnectionOption().click();
      kserveModal.findConnectionNameInput().type('Test Name');
      kserveModal.findConnectionFieldInput('URI').type('https://test');
      kserveModal.findSubmitButton().should('be.enabled');

      // test submitting form, an error should appear
      kserveModal.findSubmitButton().click();

      // dry run request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
      });

      // dry run request
      cy.wait('@createInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
      });

      cy.findByText('Error creating model server');

      // the serving runtime should NOT have been created
      cy.get('@createServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(1); // 1 dry-run request only
      });

      // the inference service should NOT have been created
      cy.get('@createInferenceService.all').then((interceptions) => {
        expect(interceptions).to.have.length(1); // 1 dry-run request only
      });
    });

    it('Successfully submit KServe Modal on edit', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: true,
        disableModelMeshConfig: true,
        disableServingRuntimeParams: false,
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'llama-service',
            displayName: 'Llama Service',
            modelName: 'llama-service',
            isModelMesh: false,
            args: ['--arg=value'],
            env: [{ name: 'test-name', value: 'test-value' }],
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

      // click on the toggle button and open edit model server
      modelServingSection.getKServeRow('Llama Service').find().findKebabAction('Edit').click();

      kserveModalEdit.shouldBeOpen();

      kserveModalEdit.findServingRuntimeArgumentsSectionInput().clear().type('--arg=value1');
      kserveModalEdit.findServingRuntimeEnvVarsName('0').clear().type('test-name1');

      // Submit button should be enabled
      kserveModalEdit.findSubmitButton().should('be.enabled');
      // Should allow editing
      kserveModalEdit.findSubmitButton().click();
      kserveModalEdit.shouldBeOpen(false);

      //dry run request
      cy.wait('@updateServingRuntime').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          metadata: {
            labels: { name: 'llama-service', 'opendatahub.io/dashboard': 'true' },
            annotations: {
              'opendatahub.io/template-display-name': 'OpenVINO Serving Runtime (Supports GPUs)',
              'opendatahub.io/accelerator-name': '',
              'opendatahub.io/template-name': 'ovms',
              'openshift.io/display-name': 'llama-service',
              'opendatahub.io/apiProtocol': 'REST',
            },
            name: 'llama-service',
            namespace: 'test-project',
          },
        });
      });

      // Actual request
      cy.wait('@updateServingRuntime').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      cy.get('@updateServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry run request and 1 actual request
      });

      cy.wait('@updateInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          apiVersion: 'serving.kserve.io/v1beta1',
          kind: 'InferenceService',
          metadata: {
            annotations: {
              'openshift.io/display-name': 'Llama Service',
              'serving.knative.openshift.io/enablePassthrough': 'true',
              'sidecar.istio.io/inject': 'true',
              'sidecar.istio.io/rewriteAppHTTPProbers': 'true',
            },
            generation: 1,
            labels: { name: 'llama-service', 'opendatahub.io/dashboard': 'true' },
            name: 'llama-service',
            namespace: 'test-project',
          },
          spec: {
            predictor: {
              minReplicas: 1,
              maxReplicas: 1,
              model: {
                modelFormat: { name: 'onnx', version: '1' },
                runtime: 'llama-service',
                storage: { key: 'test-secret', path: 'path/to/model' },
                args: ['--arg=value1'],
                env: [{ name: 'test-name1', value: 'test-value' }],
                resources: {
                  requests: { cpu: '1', memory: '4Gi' },
                  limits: { cpu: '2', memory: '8Gi' },
                },
              },
            },
          },
        });
      });

      // Actual request
      cy.wait('@updateInferenceService').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      cy.get('@updateInferenceService.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry run request and 1 actaul request
      });
    });

    it('KServe Model list', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: false,
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
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'test-model',
            displayName: 'test-model',
            modelName: 'test-model',
            isModelMesh: false,
            activeModelState: 'Loaded',
          }),
        ],
      });
      cy.clearLocalStorage(STOP_MODAL_PREFERENCE_KEY);
      cy.window().then((win) => win.localStorage.setItem(STOP_MODAL_PREFERENCE_KEY, 'false'));
      projectDetails.visitSection('test-project', 'model-server');

      const kserveRow = modelServingSection.getKServeRow('test-model');
      kserveRow.findStatusLabel('Running');

      const stoppedInferenceService = mockInferenceServiceK8sResource({
        name: 'test-model',
        displayName: 'test-model',
        modelName: 'test-model',
        isModelMesh: false,
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
        isModelMesh: false,
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
      cy.wait(['@startModelPatch', '@getStartedModel']);
      kserveRow.findStatusLabel('Running');
      kserveRow.findStateActionToggle().should('have.text', 'Stop');
    });

    it('Check number of replicas of model', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: true,
        disableModelMeshConfig: true,
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'llama-service',
            displayName: 'Llama Service',
            modelName: 'llama-service',
            isModelMesh: false,
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

    it('Successfully deletes KServe model server', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        inferenceServices: [
          mockInferenceServiceK8sResource({ name: 'test-inference', isModelMesh: false }),
          mockInferenceServiceK8sResource({
            name: 'ovms-testing',
            displayName: 'OVMS ONNX',
            isModelMesh: false,
          }),
        ],
      });
      cy.interceptK8s(
        'DELETE',
        { model: ServingRuntimeModel, ns: 'test-project', name: 'test-model-legacy' },
        mock200Status({}),
      ).as('deleteServingRuntimes');
      cy.interceptK8s(
        'DELETE',
        {
          model: ServiceAccountModel,
          ns: 'test-project',
          name: 'test-model-legacy-sa',
        },
        mock200Status({}),
      ).as('deleteServiceAccounts');
      cy.interceptK8s(
        'DELETE',
        {
          model: RoleBindingModel,
          ns: 'test-project',
          name: 'test-model-legacy-view',
        },
        mock200Status({}),
      ).as('deleteRoleBindings');
      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection.getModelMeshRow('ovms').findKebabAction('Delete model server').click();
      deleteModal.shouldBeOpen();
      deleteModal.findSubmitButton().should('be.disabled');

      deleteModal.findInput().type('test-model-legacy');
      deleteModal.findSubmitButton().should('be.enabled');
      deleteModal.findSubmitButton().click();
      cy.wait('@deleteServingRuntimes');
      cy.wait('@deleteServiceAccounts');
      cy.wait('@deleteRoleBindings');
    });

    it('Check path error in KServe Modal', () => {
      initIntercepts({
        disableModelMeshConfig: false,
        disableKServeConfig: false,
        servingRuntimes: [],
        projectEnableModelMesh: false,
      });
      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findDeployModelButton().click();

      kserveModal.shouldBeOpen();

      kserveModal.findSubmitButton().should('be.disabled');

      // test filling in minimum required fields
      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateSearchSelector().click();
      kserveModal.findGlobalScopedTemplateOption('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      kserveModal.findSubmitButton().should('be.disabled');
      kserveModal.findNewConnectionOption().click();
      kserveModal.findConnectionNameInput().type('Test Name');
      kserveModal.findConnectionFieldInput('URI').type('https://test');
      kserveModal.findSubmitButton().should('be.enabled');
      kserveModal.findExistingConnectionOption().click();
      kserveModal.findExistingConnectionSelect().should('have.attr', 'disabled');
      kserveModal.findLocationPathInput().type('test-model/');
      kserveModal
        .findExistingConnectionSelect()
        .findByRole('combobox')
        .should('have.value', 'Test Secret');
      kserveModal.findSubmitButton().should('be.enabled');
      kserveModal.findLocationPathInput().clear();

      // Check with root path
      kserveModal.findLocationPathInput().type('/');
      kserveModal.findSubmitButton().should('be.disabled');
      kserveModal
        .findLocationPathInputError()
        .should('be.visible')
        .contains('The path must not point to a root folder');
      kserveModal.findLocationPathInput().clear();

      // Check path with special characters
      kserveModal.findLocationPathInput().type('invalid/path/@#%#@%');
      kserveModal.findSubmitButton().should('be.disabled');
      kserveModal.findLocationPathInputError().should('be.visible').contains('Invalid path format');
      kserveModal.findLocationPathInput().clear();

      // Check path with extra slashes in between
      kserveModal.findLocationPathInput().type('invalid/path///test');
      kserveModal.findSubmitButton().should('be.disabled');
      kserveModal.findLocationPathInputError().should('be.visible').contains('Invalid path format');
      kserveModal.findLocationPathInput().clear();

      kserveModal.findLocationPathInput().type('correct-path');
      kserveModal.findSubmitButton().should('be.enabled');
    });

    it('Check authentication section', () => {
      initIntercepts({
        disableModelMeshConfig: false,
        disableKServeConfig: false,
        servingRuntimes: [],
        requiredCapabilities: [StackCapability.SERVICE_MESH, StackCapability.SERVICE_MESH_AUTHZ],
        projectEnableModelMesh: false,
      });
      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findDeployModelButton().click();

      kserveModal.shouldBeOpen();

      kserveModal.findSubmitButton().should('be.disabled');

      // Test labels are correct
      expect(
        kserveModal.findAuthenticationSection().findByText('Token authentication').should('exist'),
      );
      expect(
        kserveModal
          .findAuthenticationSection()
          .findByText('Require token authentication')
          .should('exist'),
      );
    });

    it('Deploy KServe raw model (with serverless available)', () => {
      initIntercepts({
        disableModelMeshConfig: false,
        disableKServeConfig: false,
        disableServingRuntimeParams: false,
        servingRuntimes: [],
        requiredCapabilities: [StackCapability.SERVICE_MESH, StackCapability.SERVICE_MESH_AUTHZ],
        projectEnableModelMesh: false,
      });
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableKServeRaw: false,
        }),
      );

      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findDeployModelButton().click();

      kserveModal.shouldBeOpen();

      // test that you can not submit on empty
      kserveModal.findSubmitButton().should('be.disabled');

      // test filling in minimum required fields
      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateSearchSelector().click();
      kserveModal.findGlobalScopedTemplateOption('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      kserveModal.findSubmitButton().should('be.disabled');
      // misc.
      kserveModal.findModelRouteCheckbox().check();
      kserveModal.findAuthenticationCheckbox().check();
      kserveModal.findExternalRouteError().should('not.exist');
      kserveModal.findServiceAccountNameInput().should('have.value', 'default-name');
      kserveModal.findExistingConnectionOption().click();
      kserveModal.findExistingConnectionSelect().should('have.attr', 'disabled');
      kserveModal
        .findExistingConnectionSelect()
        .findByRole('combobox')
        .should('have.value', 'Test Secret');
      kserveModal.findLocationPathInput().type('test-model/');
      kserveModal.findSubmitButton().should('be.enabled');
      // raw
      kserveModal.findDeploymentModeSelect().should('contain.text', 'Advanced');

      // Test advanced mode replica settings
      kserveModal.findMinReplicasInput().should('have.value', '1');
      kserveModal.findMinReplicasPlusButton().should('be.disabled');
      kserveModal.findMaxReplicasInput().should('have.value', '1');
      kserveModal.findMaxReplicasMinusButton().should('be.disabled');
      kserveModal.findMaxReplicasPlusButton().click();
      kserveModal.findMaxReplicasInput().should('have.value', '2');
      kserveModal.findMinReplicasPlusButton().click();
      kserveModal.findMinReplicasInput().should('have.value', '2');

      // Test max limit of 99
      kserveModal.findMaxReplicasInput().clear().type('100');
      kserveModal.findMaxReplicasInput().should('have.value', '99');
      kserveModal.findMaxReplicasPlusButton().should('be.disabled');
      kserveModal.findDeploymentModeSelect().findSelectOption('Standard').click();

      // test submitting form, the modal should close to indicate success.
      kserveModal.findSubmitButton().click();
      kserveModal.shouldBeOpen(false);

      // dry run request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          metadata: {
            name: 'test-name',
            annotations: {
              'openshift.io/display-name': 'test-name',
              'opendatahub.io/apiProtocol': 'REST',
              'opendatahub.io/template-name': 'template-2',
              'opendatahub.io/template-display-name': 'Caikit',
              'opendatahub.io/accelerator-name': '',
            },
            namespace: 'test-project',
          },
          spec: {
            protocolVersions: ['grpc-v1'],
            supportedModelFormats: [
              { autoSelect: true, name: 'openvino_ir', version: 'opset1' },
              { autoSelect: true, name: 'onnx', version: '1' },
            ],
          },
        });
      });

      // Actual request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      // the serving runtime should have been created
      cy.get('@createServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });

      cy.wait('@createInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          apiVersion: 'serving.kserve.io/v1beta1',
          kind: 'InferenceService',
          metadata: {
            name: 'test-name',
            namespace: 'test-project',
            annotations: {
              'openshift.io/display-name': 'Test Name',
              'serving.kserve.io/deploymentMode': DeploymentMode.RawDeployment,
              'security.opendatahub.io/enable-auth': 'true',
            },
            labels: {
              'opendatahub.io/dashboard': 'true',
              'networking.kserve.io/visibility': 'exposed',
            },
          },
          spec: {
            predictor: {
              minReplicas: 2,
              maxReplicas: 2,
              model: {
                modelFormat: { name: 'onnx', version: '1' },
                runtime: 'test-name',
                storage: { key: 'test-secret', path: 'test-model/' },
                resources: {
                  requests: { cpu: '1', memory: '4Gi' },
                  limits: { cpu: '2', memory: '8Gi' },
                },
              },
            },
          },
        });
      });

      //dry run request
      cy.wait('@createRole').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          metadata: {
            name: 'test-name-view-role',
            namespace: 'test-project',
            ownerReferences: [],
          },
          rules: [
            {
              verbs: ['get'],
              apiGroups: ['serving.kserve.io'],
              resources: ['inferenceservices'],
              resourceNames: ['test-name'],
            },
          ],
        });
      });

      //Actual request
      cy.wait('@createRole').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      cy.get('@createRole.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); //1 dry run request and 1 actual request
      });
    });

    it('Deploy KServe raw model (with serverless disabled)', () => {
      initIntercepts({
        disableModelMeshConfig: false,
        disableKServeConfig: false,
        disableServingRuntimeParams: false,
        disableKServeRaw: false,
        servingRuntimes: [],
        requiredCapabilities: [],
        projectEnableModelMesh: false,
        DscComponents: { kserve: { serverlessMode: 'Removed' } },
      });

      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findDeployModelButton().click();

      kserveModal.shouldBeOpen();

      // test that you can not submit on empty
      kserveModal.findSubmitButton().should('be.disabled');

      // test filling in minimum required fields
      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateSearchSelector().click();
      kserveModal.findGlobalScopedTemplateOption('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      kserveModal.findSubmitButton().should('be.disabled');
      // misc.
      kserveModal.findModelRouteCheckbox().check();
      kserveModal.findAuthenticationCheckbox().check();
      kserveModal.findExternalRouteError().should('not.exist');
      kserveModal.findServiceAccountNameInput().should('have.value', 'default-name');
      kserveModal.findExistingConnectionOption().click();
      kserveModal.findExistingConnectionSelect().should('have.attr', 'disabled');
      kserveModal
        .findExistingConnectionSelect()
        .findByRole('combobox')
        .should('have.value', 'Test Secret');
      kserveModal.findLocationPathInput().type('test-model/');
      kserveModal.findSubmitButton().should('be.enabled');
      // raw

      // test submitting form, the modal should close to indicate success.
      kserveModal.findSubmitButton().click();
      kserveModal.shouldBeOpen(false);

      // dry run request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          metadata: {
            name: 'test-name',
            annotations: {
              'openshift.io/display-name': 'test-name',
              'opendatahub.io/apiProtocol': 'REST',
              'opendatahub.io/template-name': 'template-2',
              'opendatahub.io/template-display-name': 'Caikit',
              'opendatahub.io/accelerator-name': '',
            },
            namespace: 'test-project',
          },
          spec: {
            protocolVersions: ['grpc-v1'],
            supportedModelFormats: [
              { autoSelect: true, name: 'openvino_ir', version: 'opset1' },
              { autoSelect: true, name: 'onnx', version: '1' },
            ],
          },
        });
      });

      // Actual request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      // the serving runtime should have been created
      cy.get('@createServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });

      cy.wait('@createInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          apiVersion: 'serving.kserve.io/v1beta1',
          kind: 'InferenceService',
          metadata: {
            name: 'test-name',
            namespace: 'test-project',
            annotations: {
              'openshift.io/display-name': 'Test Name',
              'serving.kserve.io/deploymentMode': DeploymentMode.RawDeployment,
              'security.opendatahub.io/enable-auth': 'true',
            },
            labels: {
              'opendatahub.io/dashboard': 'true',
              'networking.kserve.io/visibility': 'exposed',
            },
          },
          spec: {
            predictor: {
              minReplicas: 1,
              maxReplicas: 1,
              model: {
                modelFormat: { name: 'onnx', version: '1' },
                runtime: 'test-name',
                storage: { key: 'test-secret', path: 'test-model/' },
                resources: {
                  requests: { cpu: '1', memory: '4Gi' },
                  limits: { cpu: '2', memory: '8Gi' },
                },
              },
            },
          },
        });
      });

      //dry run request
      cy.wait('@createRole').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          metadata: {
            name: 'test-name-view-role',
            namespace: 'test-project',
            ownerReferences: [],
          },
          rules: [
            {
              verbs: ['get'],
              apiGroups: ['serving.kserve.io'],
              resources: ['inferenceservices'],
              resourceNames: ['test-name'],
            },
          ],
        });
      });

      //Actual request
      cy.wait('@createRole').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      cy.get('@createRole.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); //1 dry run request and 1 actual request
      });
    });

    it('Check environment variables validation in KServe Modal', () => {
      initIntercepts({
        disableModelMeshConfig: false,
        disableKServeConfig: false,
        disableServingRuntimeParams: false,
        servingRuntimes: [],
        projectEnableModelMesh: false,
      });

      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection.findDeployModelButton().click();
      kserveModal.shouldBeOpen();

      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateSearchSelector().click();
      kserveModal.findGlobalScopedTemplateOption('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      kserveModal.findExistingConnectionOption().click();
      kserveModal.findLocationPathInput().type('test-model/');

      // Verify submit is enabled before testing env vars
      kserveModal.findSubmitButton().should('be.enabled');

      // Add environment variable with invalid name
      kserveModal.findServingRuntimeEnvVarsSectionAddButton().click();
      kserveModal.findServingRuntimeEnvVarsName('0').type('1invalid-name');
      cy.findByText('Must not start with a digit.').should('be.visible');
      // Verify submit is disabled with invalid env var
      kserveModal.findSubmitButton().should('be.disabled');

      // Test invalid env var name with special characters
      kserveModal.findServingRuntimeEnvVarsName('0').clear().type('invalid@name');
      cy.findByText("Must consist of alphabetic characters, digits, '_', '-', or '.'").should(
        'be.visible',
      );
      // Verify submit remains disabled
      kserveModal.findSubmitButton().should('be.disabled');

      // Test valid env var name
      kserveModal.findServingRuntimeEnvVarsName('0').clear().type('VALID_NAME');
      kserveModal.findServingRuntimeEnvVarsValue('0').type('test-value');
      cy.findByText('Must not start with a digit.').should('not.exist');
      cy.get('[data-testid="serving-runtime-environment-variables-input-name 0"]').should(
        'have.attr',
        'aria-invalid',
        'false',
      );
      kserveModal.findSubmitButton().should('be.enabled');
    });

    it('Deploy OCI Model and check paste functionality', () => {
      initIntercepts({
        disableModelMeshConfig: false,
        disableKServeConfig: false,
        disableServingRuntimeParams: false,
        servingRuntimes: [],
        requiredCapabilities: [StackCapability.SERVICE_MESH, StackCapability.SERVICE_MESH_AUTHZ],
        projectEnableModelMesh: false,
      });

      cy.interceptK8sList(
        SecretModel,
        mockK8sResourceList([
          mockCustomSecretK8sResource({
            type: 'kubernetes.io/dockerconfigjson',
            namespace: 'test-project',
            name: 'test-secret',
            annotations: {
              'opendatahub.io/connection-type': 'oci-v1',
              'openshift.io/display-name': 'Test Secret',
            },
            data: {
              '.dockerconfigjson':
                'eyJhdXRocyI6IHsidGVzdC5pbyI6IHsiYXV0aCI6ICJibGFoYmxhaGJsYWgifX19Cg==',
              OCI_HOST: 'dGVzdC5pby9vcmdhbml6YXRpb24K',
              ACCESS_TYPE: 'WyJQdWxsIl0',
            },
          }),
        ]),
      );

      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findDeployModelButton().click();

      kserveModal.shouldBeOpen();

      // test that you can not submit on empty
      kserveModal.findSubmitButton().should('be.disabled');

      // test filling in minimum required fields
      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateSearchSelector().click();
      kserveModal.findGlobalScopedTemplateOption('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      kserveModal.findSubmitButton().should('be.disabled');

      kserveModal.findExistingConnectionOption().click();
      kserveModal
        .findExistingConnectionSelect()
        .findByRole('combobox')
        .should('have.value', 'Test Secret');
      kserveModal.findOCIModelURI().click();
      kserveModal.findOCIModelURI().trigger('paste', {
        clipboardData: {
          getData: () => 'https://test.io/organization/test-model:latest',
        },
      });
      kserveModal.findOCIModelURI().blur();
      kserveModal.findSubmitButton().should('be.enabled');

      // test submitting form, the modal should close to indicate success.
      kserveModal.findSubmitButton().click();
      kserveModal.shouldBeOpen(false);

      // dry run request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          metadata: {
            name: 'test-name',
            annotations: {
              'openshift.io/display-name': 'test-name',
              'opendatahub.io/apiProtocol': 'REST',
              'opendatahub.io/template-name': 'template-2',
              'opendatahub.io/template-display-name': 'Caikit',
              'opendatahub.io/accelerator-name': '',
            },
            namespace: 'test-project',
          },
          spec: {
            protocolVersions: ['grpc-v1'],
            supportedModelFormats: [
              { autoSelect: true, name: 'openvino_ir', version: 'opset1' },
              { autoSelect: true, name: 'onnx', version: '1' },
            ],
          },
        });
      });

      // Actual request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      // the serving runtime should have been created
      cy.get('@createServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });

      cy.wait('@createInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          apiVersion: 'serving.kserve.io/v1beta1',
          kind: 'InferenceService',
          metadata: {
            name: 'test-name',
            namespace: 'test-project',
            annotations: {
              'openshift.io/display-name': 'Test Name',
              'serving.kserve.io/deploymentMode': DeploymentMode.Serverless,
              'serving.knative.openshift.io/enablePassthrough': 'true',
              'sidecar.istio.io/inject': 'true',
              'sidecar.istio.io/rewriteAppHTTPProbers': 'true',
            },
            labels: {
              'opendatahub.io/dashboard': 'true',
              'networking.knative.dev/visibility': 'cluster-local',
            },
          },
          spec: {
            predictor: {
              minReplicas: 1,
              maxReplicas: 1,
              imagePullSecrets: [{ name: 'test-secret' }],
              model: {
                modelFormat: { name: 'onnx', version: '1' },
                runtime: 'test-name',
                storageUri: 'oci://test.io/organization/test-model:latest',
                resources: {
                  requests: { cpu: '1', memory: '4Gi' },
                  limits: { cpu: '2', memory: '8Gi' },
                },
              },
            },
          },
        });
      });
    });
  });

  describe('ModelMesh model server', () => {
    it('Add ModelMesh model server', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        inferenceServices: [
          mockInferenceServiceK8sResource({ name: 'test-inference', isModelMesh: true }),
          mockInferenceServiceK8sResource({
            name: 'another-inference-service',
            displayName: 'Another Inference Service',
            deleted: true,
            isModelMesh: true,
          }),
          mockInferenceServiceK8sResource({
            name: 'ovms-testing',
            displayName: 'OVMS ONNX',
            isModelMesh: true,
          }),
        ],
      });
      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findAddModelServerButton().click();

      createServingRuntimeModal.shouldBeOpen();

      // test that you can not submit on empty
      createServingRuntimeModal.findSubmitButton().should('be.disabled');

      // test filling in minimum required fields
      createServingRuntimeModal.k8sNameDescription.findDisplayNameInput().type('Test Name');
      createServingRuntimeModal.findServingRuntimeTemplateSearchSelector().click();
      createServingRuntimeModal.findGlobalScopedTemplateOption('New OVMS Server').click();
      createServingRuntimeModal.findSubmitButton().should('be.enabled');

      // test invalid resource name
      createServingRuntimeModal.k8sNameDescription.findResourceEditLink().click();
      createServingRuntimeModal.k8sNameDescription
        .findResourceNameInput()
        .should('have.attr', 'aria-invalid', 'false');
      createServingRuntimeModal.k8sNameDescription
        .findResourceNameInput()
        .should('have.value', 'test-name');
      // Invalid character k8s names fail
      createServingRuntimeModal.k8sNameDescription
        .findResourceNameInput()
        .clear()
        .type('InVaLiD vAlUe!');
      createServingRuntimeModal.k8sNameDescription
        .findResourceNameInput()
        .should('have.attr', 'aria-invalid', 'true');
      createServingRuntimeModal.findSubmitButton().should('be.disabled');
      createServingRuntimeModal.k8sNameDescription
        .findResourceNameInput()
        .clear()
        .type('test-name');
      createServingRuntimeModal.findSubmitButton().should('be.enabled');

      // test the if the alert is visible when route is external while token is not set
      createServingRuntimeModal.findModelRouteCheckbox().should('not.be.checked');
      createServingRuntimeModal.findAuthenticationCheckbox().should('not.be.checked');
      createServingRuntimeModal.findExternalRouteError().should('not.exist');
      // check external route, token should be checked and no alert
      createServingRuntimeModal.findModelRouteCheckbox().check();
      createServingRuntimeModal.findAuthenticationCheckbox().should('be.checked');
      createServingRuntimeModal.findExternalRouteError().should('not.exist');
      createServingRuntimeModal.findServiceAccountNameInput().should('have.value', 'default-name');
      // check external route, uncheck token, show alert
      createServingRuntimeModal.findAuthenticationCheckbox().uncheck();
      createServingRuntimeModal.findExternalRouteError().should('exist');
      // internal route, set token, no alert
      createServingRuntimeModal.findModelRouteCheckbox().uncheck();
      createServingRuntimeModal.findAuthenticationCheckbox().check();
      createServingRuntimeModal.findExternalRouteError().should('not.exist');

      createServingRuntimeModal.findSubmitButton().should('be.enabled');
      createServingRuntimeModal.findSubmitButton().click();

      //dry run request
      cy.wait('@createServiceAccount').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.eql({
          apiVersion: 'v1',
          kind: 'ServiceAccount',
          metadata: { name: 'test-name-sa', namespace: 'test-project', ownerReferences: [] },
        });
      });

      //Actual request
      cy.wait('@createServiceAccount').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      cy.get('@createServiceAccount.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); //1 dry run request and 1 actual request
      });

      //dry run request
      cy.wait('@createRoleBinding').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          metadata: {
            name: 'test-name-view',
            namespace: 'test-project',
            ownerReferences: [],
          },
          roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind: 'ClusterRole', name: 'view' },
          subjects: [{ kind: 'ServiceAccount', name: 'test-name-sa' }],
        });
      });

      //Actual request
      cy.wait('@createRoleBinding').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      cy.get('@createRoleBinding.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); //1 dry run request and 1 actual request
      });
    });

    it('should display accelerator profile selection when both accelerator profile and project-scoped feature flag is enabled for Model mesh, while adding model server', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableProjectScoped: false,
        inferenceServices: [
          mockInferenceServiceK8sResource({ name: 'test-inference', isModelMesh: true }),
          mockInferenceServiceK8sResource({
            name: 'another-inference-service',
            displayName: 'Another Inference Service',
            deleted: true,
            isModelMesh: true,
          }),
          mockInferenceServiceK8sResource({
            name: 'ovms-testing',
            displayName: 'OVMS ONNX',
            isModelMesh: true,
          }),
        ],
      });

      cy.interceptK8sList(
        { model: AcceleratorProfileModel, ns: 'test-project' },
        mockK8sResourceList(mockProjectScopedAcceleratorProfiles),
      ).as('acceleratorProfiles');

      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection.findAddModelServerButton().click();
      createServingRuntimeModal.shouldBeOpen();

      // verify available project-scoped accelerator profile
      acceleratorProfileSection.findAcceleratorProfileSearchSelector().should('exist');
      acceleratorProfileSection.findAcceleratorProfileSearchSelector().click();

      const projectScopedAcceleratorProfile =
        acceleratorProfileSection.getProjectScopedAcceleratorProfile();
      projectScopedAcceleratorProfile
        .find()
        .findByRole('menuitem', { name: 'Small Profile nvidia.com/gpu', hidden: true })
        .click();
      acceleratorProfileSection.findProjectScopedLabel().should('exist');

      // verify available global-scoped hardware profile
      acceleratorProfileSection.findAcceleratorProfileSearchSelector().click();
      const globalScopedHardwareProfile =
        acceleratorProfileSection.getGlobalScopedAcceleratorProfile();
      globalScopedHardwareProfile
        .find()
        .findByRole('menuitem', {
          name: 'NVIDIA GPU Lorem, ipsum dolor sit amet consectetur adipisicing elit. Saepe, quis nvidia.com/gpu',
          hidden: true,
        })
        .click();
      acceleratorProfileSection.findGlobalScopedLabel().should('exist');
    });

    it('should display accelerator profile selection when both accelerator profile and project-scoped feature flag is enabled for Model mesh, while editing model server', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableAccelerator: false,
        disableProjectScoped: false,
        servingRuntimes: [
          mockServingRuntimeK8sResource({
            name: 'test-model',
            namespace: 'test-project',
            auth: true,
            route: true,
            acceleratorName: 'small-profile',
          }),
        ],
      });

      cy.interceptK8sList(
        { model: AcceleratorProfileModel, ns: 'test-project' },
        mockK8sResourceList(mockProjectScopedAcceleratorProfiles),
      ).as('acceleratorProfiles');

      projectDetails.visitSection('test-project', 'model-server');

      // click on the toggle button and open edit model server
      modelServingSection
        .getModelMeshRow('OVMS Model Serving')
        .find()
        .findKebabAction('Edit model server')
        .click();

      editServingRuntimeModal.shouldBeOpen();
      // cy.wait('@acceleratorProfile');
      acceleratorProfileSection
        .findAcceleratorProfileSearchSelector()
        .should('contain.text', 'Small Profile');
      acceleratorProfileSection.findProjectScopedLabel().should('exist');
    });

    it('Check project-scoped accelerator when enabled and selected', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableAccelerator: false,
        disableProjectScoped: false,
        servingRuntimes: [
          mockServingRuntimeK8sResource({
            name: 'test-model',
            namespace: 'test-project',
            auth: true,
            route: true,
            acceleratorName: 'small-profile',
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection.findModelServer().click();
      modelServingSection
        .findAcceleratorSection()
        .should('have.text', 'AcceleratorSmall Profile Project-scoped');
    });

    it('Check project-scoped hardware when enabled and selected', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableHardwareProfiles: false,
        disableAccelerator: false,
        disableProjectScoped: false,
        servingRuntimes: [
          mockServingRuntimeK8sResource({
            hardwareProfileName: 'large-profile-1',
            hardwareProfileNamespace: 'test-project',
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection.findModelServer().click();
      modelServingSection
        .findHardwareSection()
        .should('have.text', 'Large Profile-1Project-scoped');
    });

    it('should display hardware profile selection when both hardware profile and project-scoped feature flag is enabled for Model mesh, while adding model server', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableHardwareProfiles: false,
        disableProjectScoped: false,
        inferenceServices: [
          mockInferenceServiceK8sResource({ name: 'test-inference', isModelMesh: true }),
          mockInferenceServiceK8sResource({
            name: 'another-inference-service',
            displayName: 'Another Inference Service',
            deleted: true,
            isModelMesh: true,
          }),
          mockInferenceServiceK8sResource({
            name: 'ovms-testing',
            displayName: 'OVMS ONNX',
            isModelMesh: true,
          }),
        ],
      });
      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findAddModelServerButton().click();

      createServingRuntimeModal.shouldBeOpen();

      // Verify hardware profile section exists
      hardwareProfileSection.findHardwareProfileSearchSelector().should('exist');
      hardwareProfileSection.findHardwareProfileSearchSelector().click();

      // verify available project-scoped hardware profile
      const projectScopedHardwareProfile = hardwareProfileSection.getProjectScopedHardwareProfile();
      projectScopedHardwareProfile
        .find()
        .findByRole('menuitem', {
          name: 'Small Profile CPU: Request = 1; Limit = 1; Memory: Request = 2Gi; Limit = 2Gi',
          hidden: true,
        })
        .click();
      hardwareProfileSection.findProjectScopedLabel().should('exist');

      // verify available global-scoped hardware profile
      hardwareProfileSection.findHardwareProfileSearchSelector().click();
      const globalScopedHardwareProfile = hardwareProfileSection.getGlobalScopedHardwareProfile();
      globalScopedHardwareProfile
        .find()
        .findByRole('menuitem', {
          name: 'Small Profile CPU: Request = 1; Limit = 1; Memory: Request = 2Gi; Limit = 2Gi',
          hidden: true,
        })
        .click();
      hardwareProfileSection.findGlobalScopedLabel().should('exist');
    });

    it('should display hardware profile selection when both hardware profile and project-scoped feature flag is enabled for Model mesh, while editing model server', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableHardwareProfiles: false,
        disableProjectScoped: false,
        servingRuntimes: [
          mockServingRuntimeK8sResource({
            hardwareProfileName: 'large-profile-1',
            hardwareProfileNamespace: 'test-project',
          }),
        ],
        inferenceServices: [
          mockInferenceServiceK8sResource({ name: 'test-inference', isModelMesh: true }),
          mockInferenceServiceK8sResource({
            name: 'ovms-testing',
            displayName: 'OVMS ONNX',
            isModelMesh: true,
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');

      // click on the toggle button and open edit model server
      modelServingSection
        .getModelMeshRow('OVMS Model Serving')
        .find()
        .findKebabAction('Edit model server')
        .click();

      editServingRuntimeModal.shouldBeOpen();

      hardwareProfileSection
        .findHardwareProfileSearchSelector()
        .should('contain.text', 'Large Profile-1');
      hardwareProfileSection.findProjectScopedLabel().should('exist');
    });

    it('Edit ModelMesh model server', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        inferenceServices: [
          mockInferenceServiceK8sResource({ name: 'test-inference', isModelMesh: true }),
          mockInferenceServiceK8sResource({
            name: 'ovms-testing',
            displayName: 'OVMS ONNX',
            isModelMesh: true,
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');

      // click on the toggle button and open edit model server
      modelServingSection
        .getModelMeshRow('ovms')
        .find()
        .findKebabAction('Edit model server')
        .click();

      editServingRuntimeModal.shouldBeOpen();

      // test name field
      editServingRuntimeModal.findSubmitButton().should('be.disabled');
      editServingRuntimeModal.k8sNameDescription.findDisplayNameInput().clear();
      editServingRuntimeModal.k8sNameDescription.findDisplayNameInput().type('New name');
      editServingRuntimeModal.findSubmitButton().should('be.enabled');
      editServingRuntimeModal.k8sNameDescription.findDisplayNameInput().clear();
      editServingRuntimeModal.k8sNameDescription.findDisplayNameInput().type('test-model-legacy');
      editServingRuntimeModal.findSubmitButton().should('be.disabled');
      // test replicas field
      editServingRuntimeModal.findModelServerReplicasPlusButton().click();
      editServingRuntimeModal.findSubmitButton().should('be.enabled');
      editServingRuntimeModal.findModelServerReplicasMinusButton().click();
      editServingRuntimeModal.findSubmitButton().should('be.disabled');
      // test size field
      editServingRuntimeModal
        .findModelServerSizeSelect()
        .findSelectOption(/Medium/)
        .click();
      editServingRuntimeModal.findSubmitButton().should('be.enabled');
      editServingRuntimeModal.findModelServerSizeSelect().findSelectOption(/Small/).click();
      editServingRuntimeModal.findSubmitButton().should('be.disabled');
      // test external route field
      editServingRuntimeModal.findModelRouteCheckbox().check();
      editServingRuntimeModal.findSubmitButton().should('be.enabled');
      editServingRuntimeModal.findModelRouteCheckbox().uncheck();
      editServingRuntimeModal.findAuthenticationCheckbox().uncheck();
      editServingRuntimeModal.findSubmitButton().should('be.disabled');
      // test tokens field
      editServingRuntimeModal.findAuthenticationCheckbox().check();
      editServingRuntimeModal.findSubmitButton().should('be.enabled');

      editServingRuntimeModal.findSubmitButton().click();

      cy.wait('@editModelServer').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All'); //dry run request
        expect(interception.request.body).to.containSubset({
          metadata: {
            labels: { name: 'test-model-legacy', 'opendatahub.io/dashboard': 'true' },
            annotations: {
              'enable-auth': 'true',
              'opendatahub.io/accelerator-name': '',
              'openshift.io/display-name': 'test-model-legacy',
            },
            name: 'test-model-legacy',
            namespace: 'test-project',
          },
        });
      });
    });

    it('Successfully add model server when user can edit namespace (only one serving platform enabled)', () => {
      // If only one platform is enabled, project platform selection has not happened yet and patching the namespace with the platform happens at deploy time.
      initIntercepts({
        disableKServeConfig: true,
        disableModelMeshConfig: false,
        projectEnableModelMesh: true,
      });
      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findAddModelServerButton().click();
      // modelServingGlobal.findSingleServingModelButton().click();

      createServingRuntimeModal.shouldBeOpen();

      // fill in minimum required fields
      createServingRuntimeModal.k8sNameDescription.findDisplayNameInput().type('Test Name');
      createServingRuntimeModal.findServingRuntimeTemplateSearchSelector().click();
      createServingRuntimeModal.findGlobalScopedTemplateOption('New OVMS Server').click();
      createServingRuntimeModal.findSubmitButton().should('be.enabled');

      // test submitting form, the modal should close to indicate success.
      createServingRuntimeModal.findSubmitButton().click();
      createServingRuntimeModal.shouldBeOpen(false);

      // dry run request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          metadata: {
            name: 'test-name',
            annotations: {
              'openshift.io/display-name': 'Test Name',
              'opendatahub.io/template-name': 'template-3',
              'opendatahub.io/template-display-name': 'New OVMS Server',
              'opendatahub.io/accelerator-name': '',
              'opendatahub.io/apiProtocol': 'REST',
            },
            namespace: 'test-project',
          },
        });
      });

      // Actual request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      // the serving runtime should have been created
      cy.get('@createServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });
    });

    it('Do not add model server when user cannot edit namespace (only one serving platform enabled)', () => {
      // If only one platform is enabled, project platform selection has not happened yet and patching the namespace with the platform happens at deploy time.
      initIntercepts({
        disableKServeConfig: true,
        disableModelMeshConfig: false,
        rejectAddSupportServingPlatformProject: true,
      });
      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findAddModelServerButton().click();

      createServingRuntimeModal.shouldBeOpen();

      // fill in minimum required fields
      createServingRuntimeModal.k8sNameDescription.findDisplayNameInput().type('Test Name');
      createServingRuntimeModal.findServingRuntimeTemplateSearchSelector().click();
      createServingRuntimeModal.findGlobalScopedTemplateOption('New OVMS Server').click();
      createServingRuntimeModal.findSubmitButton().should('be.enabled');

      // test submitting form, an error should appear
      createServingRuntimeModal.findSubmitButton().click();
      cy.findByText('Error creating model server');

      // dry run request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          metadata: {
            name: 'test-name',
            annotations: {
              'openshift.io/display-name': 'Test Name',
              'opendatahub.io/template-name': 'template-3',
              'opendatahub.io/template-display-name': 'New OVMS Server',
              'opendatahub.io/accelerator-name': '',
              'opendatahub.io/apiProtocol': 'REST',
            },
            namespace: 'test-project',
          },
        });
      });

      // the serving runtime should NOT have been created
      cy.get('@createServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(1); // 1 dry-run request only
      });
    });
  });

  describe('Model server with ServiceAccount and RoleBinding', () => {
    it('Add model server - do not create ServiceAccount or RoleBinding if token auth is not selected', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: false,
      });
      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findAddModelServerButton().click();

      createServingRuntimeModal.shouldBeOpen();

      // fill in minimum required fields
      createServingRuntimeModal.k8sNameDescription.findDisplayNameInput().type('Test Name');
      createServingRuntimeModal.findServingRuntimeTemplateSearchSelector().click();
      createServingRuntimeModal.findGlobalScopedTemplateOption('New OVMS Server').click();
      createServingRuntimeModal.findSubmitButton().should('be.enabled');

      // test submitting form, the modal should close to indicate success.
      createServingRuntimeModal.findSubmitButton().click();
      createServingRuntimeModal.shouldBeOpen(false);

      // dry run request only
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          metadata: {
            name: 'test-name',
            annotations: {
              'openshift.io/display-name': 'Test Name',
              'opendatahub.io/template-name': 'template-3',
              'opendatahub.io/template-display-name': 'New OVMS Server',
              'opendatahub.io/accelerator-name': '',
              'opendatahub.io/apiProtocol': 'REST',
            },
            namespace: 'test-project',
          },
        });
      });

      //Actual request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      cy.get('@createServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry run request and 1 actaul request
      });

      // the service account and role binding should not have been created
      cy.get('@createServiceAccount.all').then((interceptions) => {
        expect(interceptions).to.have.length(0);
      });
      cy.get('@createRoleBinding.all').then((interceptions) => {
        expect(interceptions).to.have.length(0);
      });
      cy.get('@createRole.all').then((interceptions) => {
        expect(interceptions).to.have.length(0);
      });
    });

    it('Add model server - create ServiceAccount and RoleBinding if token auth is selected', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: false,
      });
      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findAddModelServerButton().click();

      createServingRuntimeModal.shouldBeOpen();

      // fill in minimum required fields
      createServingRuntimeModal.k8sNameDescription.findDisplayNameInput().type('Test Name');
      createServingRuntimeModal.findServingRuntimeTemplateSearchSelector().click();
      createServingRuntimeModal.findGlobalScopedTemplateOption('New OVMS Server').click();
      createServingRuntimeModal.findSubmitButton().should('be.enabled');

      // enable auth
      createServingRuntimeModal.findAuthenticationCheckbox().check();

      // test submitting form, the modal should close to indicate success.
      createServingRuntimeModal.findSubmitButton().click();
      createServingRuntimeModal.shouldBeOpen(false);

      //dry run request
      cy.wait('@createServiceAccount').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.eql({
          apiVersion: 'v1',
          kind: 'ServiceAccount',
          metadata: { name: 'test-name-sa', namespace: 'test-project', ownerReferences: [] },
        });
      });

      // Actual request
      cy.wait('@createServiceAccount').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      // the service account and role binding should have been created
      cy.get('@createServiceAccount.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });

      // dry run request
      cy.wait('@createRoleBinding').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.containSubset({
          metadata: {
            name: 'test-name-view',
            namespace: 'test-project',
            ownerReferences: [],
          },
          roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind: 'ClusterRole', name: 'view' },
          subjects: [{ kind: 'ServiceAccount', name: 'test-name-sa' }],
        });
      });

      // Actual request
      cy.wait('@createRoleBinding').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      cy.get('@createRoleBinding.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });
    });

    it('Add model server - do not create ServiceAccount or RoleBinding if they already exist', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: false,
        serviceAccountAlreadyExists: true,
        roleBindingAlreadyExists: true,
        roleAlreadyExists: true,
      });
      projectDetails.visitSection('test-project', 'model-server');

      modelServingSection.findAddModelServerButton().click();

      createServingRuntimeModal.shouldBeOpen();

      // fill in minimum required fields
      createServingRuntimeModal.k8sNameDescription.findDisplayNameInput().type('Test Name');
      createServingRuntimeModal.findServingRuntimeTemplateSearchSelector().click();
      createServingRuntimeModal.findGlobalScopedTemplateOption('New OVMS Server').click();
      createServingRuntimeModal.findSubmitButton().should('be.enabled');

      // enable auth
      createServingRuntimeModal.findAuthenticationCheckbox().check();

      // test submitting form, the modal should close to indicate success.
      createServingRuntimeModal.findSubmitButton().click();
      createServingRuntimeModal.shouldBeOpen(false);

      //dry run request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All'); //dry run request
        expect(interception.request.body).to.containSubset({
          metadata: {
            name: 'test-name',
            annotations: {
              'enable-auth': 'true',
              'openshift.io/display-name': 'Test Name',
              'opendatahub.io/template-name': 'template-3',
              'opendatahub.io/template-display-name': 'New OVMS Server',
              'opendatahub.io/accelerator-name': '',
              'opendatahub.io/apiProtocol': 'REST',
            },
            labels: { 'opendatahub.io/dashboard': 'true' },
            namespace: 'test-project',
          },
        });
      });

      // Actual request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      cy.get('@createServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(2);
      });
      // the service account and role binding should have been created
      cy.get('@createServiceAccount.all').then((interceptions) => {
        expect(interceptions).to.have.length(0);
      });

      cy.get('@createRoleBinding.all').then((interceptions) => {
        expect(interceptions).to.have.length(0);
      });
      cy.get('@createRole.all').then((interceptions) => {
        expect(interceptions).to.have.length(0);
      });
    });
  });

  describe('Check accelerator section in serving runtime details', () => {
    it('Check accelerator when disabled', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableAccelerator: true,
      });
      projectDetails.visitSection('test-project', 'model-server');
      const kserveRow = modelServingSection.getKServeRow('Llama Caikit');
      kserveRow.findExpansion().should(be.collapsed);
      kserveRow.findToggleButton().click();
      kserveRow
        .findDescriptionListItem('Accelerator')
        .next('dd')
        .should('have.text', 'No accelerator enabled');
      kserveRow.findDescriptionListItem('Number of accelerators').should('not.exist');
    });

    it('Check accelerator when disabled but selected', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableAccelerator: true,
        servingRuntimes: [
          mockServingRuntimeK8sResourceLegacy({}),
          mockServingRuntimeK8sResource({
            name: 'test-model',
            namespace: 'test-project',
            auth: true,
            route: true,
            acceleratorName: 'migrated-gpu',
          }),
        ],
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'llama-caikit',
            displayName: 'Llama Caikit',
            url: 'http://llama-caikit.test-project.svc.cluster.local',
            activeModelState: 'Loaded',
            resources: {
              requests: {
                'nvidia.com/gpu': 1,
              },
              limits: {
                'nvidia.com/gpu': 1,
              },
            },
          }),
        ],
      });
      projectDetails.visitSection('test-project', 'model-server');
      const kserveRow = modelServingSection.getKServeRow('Llama Caikit');
      kserveRow.findExpansion().should(be.collapsed);
      kserveRow.findToggleButton().click();

      kserveRow
        .findDescriptionListItem('Accelerator')
        .next('dd')
        .should('have.text', 'NVIDIA GPU (disabled)');
      kserveRow.findDescriptionListItem('Number of accelerators').should('exist');
    });

    it('Check project-scoped accelerator when disabled but selected', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableAccelerator: true,
        disableProjectScoped: false,
        servingRuntimes: [
          mockServingRuntimeK8sResource({
            name: 'test-model',
            namespace: 'test-project',
            auth: true,
            route: true,
            acceleratorName: 'small-profile',
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');
      const kserveRow = modelServingSection.getKServeRow('Llama Caikit');
      kserveRow.findExpansion().should(be.collapsed);
      kserveRow.findToggleButton().click();
      kserveRow
        .findDescriptionListItem('Accelerator')
        .next('dd')
        .should('have.text', 'Small Profile Project-scoped (disabled)');
      kserveRow.findDescriptionListItem('Number of accelerators').should('exist');
    });

    it('Check accelerator when enabled but not selected', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableAccelerator: false,
      });
      projectDetails.visitSection('test-project', 'model-server');
      const kserveRow = modelServingSection.getKServeRow('Llama Caikit');
      kserveRow.findExpansion().should(be.collapsed);
      kserveRow.findToggleButton().click();
      kserveRow
        .findDescriptionListItem('Accelerator')
        .next('dd')
        .should('have.text', 'No accelerator selected');
      kserveRow.findDescriptionListItem('Number of accelerators').should('not.exist');
    });

    it('Check accelerator when enabled and selected', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableAccelerator: false,
        servingRuntimes: [
          mockServingRuntimeK8sResourceLegacy({}),
          mockServingRuntimeK8sResource({
            name: 'test-model',
            namespace: 'test-project',
            auth: true,
            route: true,
            acceleratorName: 'migrated-gpu',
          }),
        ],
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'llama-caikit',
            displayName: 'Llama Caikit',
            url: 'http://llama-caikit.test-project.svc.cluster.local',
            activeModelState: 'Loaded',
            resources: {
              requests: {
                'nvidia.com/gpu': '2',
              },
              limits: {
                'nvidia.com/gpu': '2',
              },
            },
          }),
        ],
      });
      projectDetails.visitSection('test-project', 'model-server');
      const kserveRow = modelServingSection.getKServeRow('Llama Caikit');
      kserveRow.findExpansion().should(be.collapsed);
      kserveRow.findToggleButton().click();
      kserveRow.findDescriptionListItem('Accelerator').next('dd').should('have.text', 'NVIDIA GPU');
      kserveRow.findDescriptionListItem('Number of accelerators').should('exist');
    });

    it('Check project-scoped accelerator when enabled and selected', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableAccelerator: false,
        disableProjectScoped: false,
        servingRuntimes: [
          mockServingRuntimeK8sResource({
            name: 'test-model',
            namespace: 'test-project',
            auth: true,
            route: true,
            acceleratorName: 'small-profile',
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');
      const kserveRow = modelServingSection.getKServeRow('Llama Caikit');
      kserveRow.findExpansion().should(be.collapsed);
      kserveRow.findToggleButton().click();
      kserveRow
        .findDescriptionListItem('Accelerator')
        .next('dd')
        .should('have.text', 'Small Profile Project-scoped');
      kserveRow.findDescriptionListItem('Number of accelerators').should('exist');
    });
  });

  describe('Check token section in serving runtime details', () => {
    it('Check token section is enabled if capability is enabled', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableAccelerator: true,
        requiredCapabilities: [StackCapability.SERVICE_MESH, StackCapability.SERVICE_MESH_AUTHZ],
      });
      projectDetails.visitSection('test-project', 'model-server');
      const kserveRow = modelServingSection.getKServeRow('Llama Caikit');
      kserveRow.findExpansion().should(be.collapsed);
      kserveRow.findToggleButton().click();
      kserveRow.findDescriptionListItem('Token authentication').should('exist');
    });

    it('Check token section is disabled if capability is disabled', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableAccelerator: true,
      });
      projectDetails.visitSection('test-project', 'model-server');
      const kserveRow = modelServingSection.getKServeRow('Llama Caikit');
      kserveRow.findExpansion().should(be.collapsed);
      kserveRow.findToggleButton().click();
      kserveRow.findDescriptionListItem('Token authentication').should('not.exist');
    });

    it('Check token section is always available for kserve raw', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableAccelerator: true,
        disableKServeRaw: false,
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'llama-caikit',
            displayName: 'Llama Caikit',
            url: 'http://llama-caikit.test-project.svc.cluster.local',
            activeModelState: 'Loaded',
            isKserveRaw: true,
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

  describe('Dry run check', () => {
    it('Check when inference service dryRun fails', () => {
      initIntercepts({
        disableModelMeshConfig: true,
        disableKServeConfig: false,
        servingRuntimes: [],
        rejectInferenceService: true,
        projectEnableModelMesh: false,
      });

      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection.findDeployModelButton().click();
      kserveModal.shouldBeOpen();

      // test filling in minimum required fields
      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateSearchSelector().click();
      kserveModal.findGlobalScopedTemplateOption('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      kserveModal.findSubmitButton().should('be.disabled');
      kserveModal.findExistingConnectionOption().click();
      kserveModal.findExistingConnectionSelect().should('have.attr', 'disabled');
      kserveModal
        .findExistingConnectionSelect()
        .findByRole('combobox')
        .should('have.value', 'Test Secret');
      kserveModal.findLocationPathInput().type('test-model/');
      kserveModal.findSubmitButton().should('be.enabled');
      kserveModal.findSubmitButton().click();

      // check url should be dryRun
      cy.wait('@createInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
      });

      // check only dryRun should execute
      cy.get('@createInferenceService.all').then((interceptions) => {
        expect(interceptions).to.have.length(1); // 1 dry-run request only
      });
    });

    it('Check when serving runtime dryRun fails', () => {
      initIntercepts({
        disableModelMeshConfig: true,
        disableKServeConfig: false,
        servingRuntimes: [],
        rejectServingRuntime: true,
        projectEnableModelMesh: false,
      });

      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection.findDeployModelButton().click();
      kserveModal.shouldBeOpen();

      // test filling in minimum required fields
      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateSearchSelector().click();
      kserveModal.findGlobalScopedTemplateOption('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      kserveModal.findSubmitButton().should('be.disabled');
      kserveModal.findExistingConnectionOption().click();
      kserveModal.findExistingConnectionSelect().should('have.attr', 'disabled');
      kserveModal
        .findExistingConnectionSelect()
        .findByRole('combobox')
        .should('have.value', 'Test Secret');
      kserveModal.findLocationPathInput().type('test-model/');
      kserveModal.findSubmitButton().should('be.enabled');
      kserveModal.findSubmitButton().click();

      // dry run request
      cy.wait('@createServingRuntime').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
      });

      // check only dryRun should execute
      cy.get('@createServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(1); // 1 dry-run request only
      });

      // check url should be dryRun
    });
  });

  describe('Model size', () => {
    it('Check model size rendered with ServingRuntime size and no InferenceServiceSize', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: true,
        disableModelMeshConfig: true,
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'llama-service',
            displayName: 'Llama Service',
            modelName: 'llama-service',
            isModelMesh: false,
            resources: undefined,
          }),
        ],
        servingRuntimes: [
          mockServingRuntimeK8sResource({
            name: 'llama-service',
            displayName: 'Llama Service',
            namespace: 'test-project',
            resources: {
              limits: {
                cpu: '2',
                memory: '8Gi',
              },
              requests: {
                cpu: '1',
                memory: '4Gi',
              },
            },
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');
      const kserveRow = modelServingSection.getKServeRow('Llama Service');
      kserveRow.findExpansion().should(be.collapsed);
      kserveRow.findToggleButton().click();
      kserveRow
        .findDescriptionListItem('Model server size')
        .next('dd')
        .should('contain.text', 'Small');

      // click on the toggle button and open edit model server
      kserveRow.find().findKebabAction('Edit').click();

      kserveModalEdit.shouldBeOpen();

      kserveModalEdit.findModelServerSizeSelect().invoke('text').should('equal', 'Small');
    });

    it('Check model size rendered with InferenceService size', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: true,
        disableModelMeshConfig: true,
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'llama-service',
            displayName: 'Llama Service',
            modelName: 'llama-service',
            isModelMesh: false,
            resources: {
              limits: {
                cpu: '2',
                memory: '8Gi',
              },
              requests: {
                cpu: '1',
                memory: '4Gi',
              },
            },
          }),
        ],
        servingRuntimes: [
          mockServingRuntimeK8sResource({
            name: 'llama-service',
            displayName: 'Llama Service',
            namespace: 'test-project',
            resources: undefined,
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');
      const kserveRow = modelServingSection.getKServeRow('Llama Service');
      kserveRow.findExpansion().should(be.collapsed);
      kserveRow.findToggleButton().click();
      kserveRow
        .findDescriptionListItem('Model server size')
        .next('dd')
        .should('contain.text', 'Small');

      // click on the toggle button and open edit model server
      kserveRow.find().findKebabAction('Edit').click();

      kserveModalEdit.shouldBeOpen();

      kserveModalEdit.findModelServerSizeSelect().invoke('text').should('equal', 'Small');
    });

    it('Check model size rendered with InferenceService custom size', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: true,
        disableModelMeshConfig: true,
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'llama-service',
            displayName: 'Llama Service',
            modelName: 'llama-service',
            isModelMesh: false,
            resources: {
              limits: {
                cpu: '1',
                memory: '10Gi',
              },
              requests: {
                cpu: '1',
                memory: '4Gi',
              },
            },
          }),
        ],
        servingRuntimes: [
          mockServingRuntimeK8sResource({
            name: 'llama-service',
            displayName: 'Llama Service',
            namespace: 'test-project',
            resources: undefined,
            disableResources: true,
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');
      const kserveRow = modelServingSection.getKServeRow('Llama Service');
      kserveRow.findExpansion().should(be.collapsed);
      kserveRow.findToggleButton().click();
      kserveRow
        .findDescriptionListItem('Model server size')
        .next('dd')
        .should('contain.text', 'Custom');

      // click on the toggle button and open edit model server
      modelServingSection.getKServeRow('Llama Service').find().findKebabAction('Edit').click();

      kserveModalEdit.shouldBeOpen();

      kserveModalEdit.findModelServerSizeSelect().invoke('text').should('equal', 'Custom');
    });
  });

  describe('Internal service', () => {
    it('Check internal service is rendered when the model is loaded in Modelmesh', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        servingRuntimes: [
          mockServingRuntimeK8sResource({
            name: 'test-model',
            auth: true,
            route: false,
          }),
        ],
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'model-loaded',
            displayName: 'Loaded model',
            isModelMesh: true,
            statusPredictor: {
              grpcUrl: 'grpc://modelmesh-serving.modelmesh:8033',
              restUrl: 'http://modelmesh-serving.modelmesh:8008',
              url: 'grpc://modelmesh-serving.modelmesh:8033',
            },
          }),
          mockInferenceServiceK8sResource({
            name: 'model-not-loaded',
            displayName: 'Model not loaded',
            isModelMesh: true,
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');

      // Expand the model serving section
      modelServingSection
        .getModelMeshRow('OVMS Model Serving')
        .findDeployedModelExpansionButton()
        .click();
      modelServingSection.findInferenceServiceTable().should('exist');

      // Get modal of inference service when is loaded
      const loadedInferenceServiceRow = modelServingSection.getInferenceServiceRow('Loaded model');
      loadedInferenceServiceRow.findInternalServiceButton().click();
      loadedInferenceServiceRow.findInternalServicePopover().findByText('grpcUrl').should('exist');

      // Get modal of inference service when is not loaded
      const notLoadedInferenceServiceRow =
        modelServingSection.getInferenceServiceRow('Model not loaded');
      notLoadedInferenceServiceRow.findInternalServiceButton().click();
      notLoadedInferenceServiceRow
        .findInternalServicePopover()
        .findByText('Could not find any internal service enabled')
        .should('exist');
    });

    it('Check internal service is rendered when the model is loaded in Kserve', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: true,
        disableModelMeshConfig: false,
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
            isModelMesh: false,
            kserveInternalUrl: 'http://test.kserve.svc.cluster.local',
            kserveInternalLabel: true,
          }),
          mockInferenceServiceK8sResource({
            name: 'model-not-loaded',
            modelName: 'est-model-not-loaded',
            displayName: 'Model Not loaded',
            isModelMesh: false,
            kserveInternalLabel: true,
          }),
        ],
      });

      projectDetails.visitSection('test-project', 'model-server');

      // Get modal of inference service when is loaded
      const kserveRowModelLoaded = modelServingSection.getKServeRow('Loaded model');
      kserveRowModelLoaded.findInternalServiceButton().click();
      kserveRowModelLoaded.findInternalServicePopover().findByText('url').should('exist');

      // Get modal of inference service when is not loaded
      const kserveRowModelNotLoaded = modelServingSection.getKServeRow('Model Not loaded');
      kserveRowModelNotLoaded.findInternalServiceButton().click();
      kserveRowModelLoaded
        .findInternalServicePopover()
        .findByText('Could not find any internal service enabled')
        .should('exist');
    });
  });
  describe('Serving Runtime Template Selection', () => {
    it('displays label in search selector when multi-model serving is selected', () => {
      initIntercepts({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: false,
      });

      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection.findAddModelServerButton().click();
      createServingRuntimeModal.findServingRuntimeTemplateSearchSelector().should('exist');
      createServingRuntimeModal.findServingRuntimeTemplateSearchSelector().click();
      createServingRuntimeModal.findGlobalScopedTemplateOption('Multi Platform').within(() => {
        createServingRuntimeModal.findServingRuntimeVersionLabel().should('exist');
      });
      createServingRuntimeModal.findGlobalScopedTemplateOption('Multi Platform').click();
      createServingRuntimeModal.findServingRuntimeTemplateSearchSelector().within(() => {
        createServingRuntimeModal.findServingRuntimeVersionLabel().should('exist');
      });
      createServingRuntimeModal.findCloseButton().click();

      // Check that the label is displayed when editing
      modelServingSection
        .getModelMeshRow('OVMS Model Serving')
        .find()
        .findKebabAction('Edit model server')
        .click();
      editServingRuntimeModal.findServingRuntimeTemplateSearchSelector().within(() => {
        editServingRuntimeModal.findServingRuntimeVersionLabel().should('exist');
      });
    });

    it('displays label in search selector when single-model serving is selected', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: false,
      });

      projectDetails.visitSection('test-project', 'model-server');
      modelServingSection.findDeployModelButton().click();
      kserveModal.findServingRuntimeTemplateSearchSelector().should('exist');
      kserveModal.findServingRuntimeTemplateSearchSelector().click();
      kserveModal.findGlobalScopedTemplateOption('Multi Platform').within(() => {
        kserveModal.findServingRuntimeVersionLabel().should('exist');
      });
      kserveModal.findGlobalScopedTemplateOption('Multi Platform').click();
      kserveModal.findServingRuntimeTemplateSearchSelector().within(() => {
        kserveModal.findServingRuntimeVersionLabel().should('exist');
      });
      kserveModal.findCloseButton().click();

      // Check that the label is displayed when editing
      modelServingSection.getKServeRow('Llama Caikit').find().findKebabAction('Edit').click();
      kserveModalEdit.findServingRuntimeTemplateSearchSelector().within(() => {
        kserveModalEdit.findServingRuntimeVersionLabel().should('exist');
      });
    });
  });
});
