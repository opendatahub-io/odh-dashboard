import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mock404Error, mock409Error } from '~/__mocks__/mockK8sStatus';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRoleBindingK8sResource } from '~/__mocks__/mockRoleBindingK8sResource';
import {
  mockRouteK8sResource,
  mockRouteK8sResourceModelServing,
} from '~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockServiceAccountK8sResource } from '~/__mocks__/mockServiceAccountK8sResource';
import {
  mockServingRuntimeK8sResource,
  mockServingRuntimeK8sResourceLegacy,
} from '~/__mocks__/mockServingRuntimeK8sResource';
import {
  mockInvalidTemplateK8sResource,
  mockServingRuntimeTemplateK8sResource,
} from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import {
  createServingRuntimeModal,
  editServingRuntimeModal,
  inferenceServiceModal,
  kserveModal,
  modelServingSection,
} from '~/__tests__/cypress/cypress/pages/modelServing';
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { ServingRuntimePlatform } from '~/types';

type HandlersProps = {
  disableKServeConfig?: boolean;
  disableModelMeshConfig?: boolean;
  disableAccelerator?: boolean;
  projectEnableModelMesh?: boolean;
  servingRuntimes?: ServingRuntimeKind[];
  inferenceServices?: InferenceServiceKind[];
  rejectAddSupportServingPlatformProject?: boolean;
  serviceAccountAlreadyExists?: boolean;
  roleBindingAlreadyExists?: boolean;
  rejectInferenceService?: boolean;
  rejectServingRuntime?: boolean;
  rejectDataConnection?: boolean;
};

const initIntercepts = ({
  disableKServeConfig,
  disableModelMeshConfig,
  disableAccelerator,
  projectEnableModelMesh,
  servingRuntimes = [
    mockServingRuntimeK8sResourceLegacy({}),
    mockServingRuntimeK8sResource({
      name: 'test-model',
      namespace: 'test-project',
      auth: true,
      route: true,
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
  rejectInferenceService = false,
  rejectServingRuntime = false,
  rejectDataConnection = false,
}: HandlersProps) => {
  cy.intercept(
    '/api/dsc/status',
    mockDscStatus({
      installedComponents: { kserve: true, 'model-mesh': true },
    }),
  );
  cy.intercept('/api/status', mockStatus());
  cy.intercept(
    '/api/config',
    mockDashboardConfig({
      disableKServe: disableKServeConfig,
      disableModelMesh: disableModelMeshConfig,
    }),
  );
  cy.intercept(
    { pathname: '/api/k8s/api/v1/namespaces/test-project/pods' },
    mockK8sResourceList([mockPodK8sResource({})]),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/test-notebook',
    },
    mockRouteK8sResource({}),
  );
  cy.intercept(
    { pathname: '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks' },
    mockK8sResourceList([mockNotebookK8sResource({})]),
  );
  cy.intercept(
    { pathname: '/api/k8s/apis/project.openshift.io/v1/projects' },
    mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: projectEnableModelMesh })]),
  );
  cy.intercept(
    { pathname: '/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims' },
    mockK8sResourceList([mockPVCK8sResource({})]),
  );
  cy.intercept(
    { pathname: '/api/k8s/apis/project.openshift.io/v1/projects/test-project' },
    mockProjectK8sResource({ enableModelMesh: projectEnableModelMesh }),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices',
    },
    mockK8sResourceList(inferenceServices),
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices',
    },
    rejectInferenceService
      ? { statusCode: 404 }
      : {
          statusCode: 200,
          body: mockInferenceServiceK8sResource({ name: 'test-inference' }),
        },
  ).as('createInferenceService');
  cy.intercept(
    {
      method: 'PUT',
      pathname:
        '/api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices/llama-service',
    },
    mockInferenceServiceK8sResource({ name: 'llama-service' }),
  );
  cy.intercept(
    { pathname: '/api/k8s/api/v1/namespaces/test-project/secrets' },
    mockK8sResourceList([mockSecretK8sResource({})]),
  );
  // used by addSupportServingPlatformProject
  cy.intercept(
    {
      pathname: '/api/namespaces/test-project/*',
    },
    rejectAddSupportServingPlatformProject
      ? { statusCode: 401 }
      : { statusCode: 200, body: { applied: true } },
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/api/v1/namespaces/test-project/serviceaccounts/test-name-sa',
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
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/k8s/api/v1/namespaces/test-project/serviceaccounts',
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
  cy.intercept(
    {
      method: 'GET',
      pathname:
        '/api/k8s/apis/rbac.authorization.k8s.io/v1/namespaces/test-project/rolebindings/test-name-view',
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
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/k8s/apis/rbac.authorization.k8s.io/v1/namespaces/test-project/rolebindings',
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
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes',
    },
    mockK8sResourceList(servingRuntimes),
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes',
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
  cy.intercept(
    {
      method: 'PUT',
      pathname:
        '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes/llama-service',
    },
    mockServingRuntimeK8sResource({
      name: 'llama-service',
      namespace: 'test-project',
    }),
  ).as('updateServingRuntime');
  cy.intercept(
    {
      method: 'GET',
      pathname:
        '/api/k8s/apis/opendatahub.io/v1alpha/namespaces/opendatahub/odhdashboardconfigs/odh-dashboard-config',
    },
    mockDashboardConfig({}),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/test-inference',
    },
    mockRouteK8sResourceModelServing({
      inferenceServiceName: 'test-inference',
      namespace: 'test-project',
    }),
  );
  cy.intercept(
    {
      pathname:
        '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/another-inference-service',
    },
    mockRouteK8sResourceModelServing({
      inferenceServiceName: 'another-inference-service',
      namespace: 'test-project',
    }),
  );
  cy.intercept(
    {
      pathname:
        '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes/test-model',
    },
    mockServingRuntimeK8sResource({}),
  );
  cy.intercept(
    {
      pathname:
        '/api/k8s/apis/dashboard.opendatahub.io/v1/namespaces/opendatahub/acceleratorprofiles',
    },
    mockK8sResourceList([
      mockAcceleratorProfile({
        name: 'migrated-gpu',
        displayName: 'NVIDIA GPU',
        enabled: !disableAccelerator,
        identifier: 'nvidia.com/gpu',
        description: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Saepe, quis',
      }),
    ]),
  );
  cy.intercept(
    { pathname: '/api/k8s/apis/template.openshift.io/v1/namespaces/opendatahub/templates' },
    mockK8sResourceList([
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
    ]),
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/k8s/api/v1/namespaces/test-project/secrets',
    },
    rejectDataConnection
      ? { statusCode: 401 }
      : {
          statusCode: 200,
          body: mockSecretK8sResource({}),
        },
  ).as('createDataConnectionSecret');
};

describe('Serving Runtime List', () => {
  describe('No server available', () => {
    it('No model serving platform available', () => {
      initIntercepts({
        disableModelMeshConfig: true,
        disableKServeConfig: true,
        servingRuntimes: [],
      });

      projectDetails.visit('test-project');

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

      projectDetails.visit('test-project');

      modelServingSection.getModelMeshRow('ovms').findDeployModelButton().click();

      inferenceServiceModal.shouldBeOpen();

      // test that you can not submit on empty
      inferenceServiceModal.findSubmitButton().should('be.disabled');

      // test filling in minimum required fields
      inferenceServiceModal.findModelNameInput().type('Test Name');
      inferenceServiceModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      inferenceServiceModal.findSubmitButton().should('be.disabled');
      inferenceServiceModal.findExistingConnectionSelect().findSelectOption('Test Secret').click();
      inferenceServiceModal.findLocationPathInput().type('test-model/');
      inferenceServiceModal.findSubmitButton().should('be.enabled');
      inferenceServiceModal.findNewDataConnectionOption().click();
      inferenceServiceModal.findLocationPathInput().clear();
      inferenceServiceModal.findSubmitButton().should('be.disabled');
      inferenceServiceModal.findLocationNameInput().type('Test Name');
      inferenceServiceModal.findLocationAccessKeyInput().type('test-key');
      inferenceServiceModal.findLocationSecretKeyInput().type('test-secret-key');
      inferenceServiceModal.findLocationEndpointInput().type('test-endpoint');
      inferenceServiceModal.findLocationBucketInput().type('test-bucket');
      inferenceServiceModal.findLocationPathInput().type('test-model/');
      inferenceServiceModal.findSubmitButton().should('be.enabled');
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

      projectDetails.visit('test-project');

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
      modelServingSection.findStatusTooltip('OVMS ONNX').should('be.visible');
      modelServingSection.findStatusTooltipValue(
        'OVMS ONNX',
        'Failed to pull model from storage due to error',
      );

      // Check status of deployed model which loaded successfully after an error
      modelServingSection.findStatusTooltip('Loaded model').should('be.visible');
      modelServingSection.findStatusTooltipValue('Loaded model', 'Loaded');

      // Check API protocol in row
      modelServingSection.findAPIProtocol('Loaded model').should('have.text', 'REST');
    });
  });

  describe('KServe', () => {
    it('Deploy KServe model', () => {
      initIntercepts({
        disableModelMeshConfig: false,
        disableKServeConfig: false,
        servingRuntimes: [],
      });

      projectDetails.visit('test-project');

      modelServingSection.findDeployModelButton().click();

      kserveModal.shouldBeOpen();

      // test that you can not submit on empty
      kserveModal.findSubmitButton().should('be.disabled');

      // test filling in minimum required fields
      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateDropdown().findDropdownItem('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      kserveModal.findSubmitButton().should('be.disabled');
      kserveModal.findExistingConnectionSelect().findSelectOption('Test Secret').click();
      kserveModal.findLocationPathInput().type('test-model/');
      kserveModal.findSubmitButton().should('be.enabled');
      kserveModal.findNewDataConnectionOption().click();
      kserveModal.findLocationPathInput().clear();
      kserveModal.findSubmitButton().should('be.disabled');
      kserveModal.findLocationNameInput().type('Test Name');
      kserveModal.findLocationAccessKeyInput().type('test-key');
      kserveModal.findLocationSecretKeyInput().type('test-secret-key');
      kserveModal.findLocationEndpointInput().type('test-endpoint');
      kserveModal.findLocationBucketInput().type('test-bucket');
      kserveModal.findLocationPathInput().type('test-model/');
      kserveModal.findSubmitButton().should('be.enabled');

      // test submitting form, the modal should close to indicate success.
      kserveModal.findSubmitButton().click();
      kserveModal.shouldBeOpen(false);

      // the serving runtime should have been created
      cy.get('@createServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });
    });

    it('Do not deploy KServe model when user cannot edit namespace', () => {
      initIntercepts({
        disableModelMeshConfig: false,
        disableKServeConfig: false,
        servingRuntimes: [],
        rejectAddSupportServingPlatformProject: true,
      });

      projectDetails.visit('test-project');

      modelServingSection.findDeployModelButton().click();

      kserveModal.shouldBeOpen();

      // test filling in minimum required fields
      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateDropdown().findDropdownItem('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      kserveModal.findExistingConnectionSelect().findSelectOption('Test Secret').click();
      kserveModal.findNewDataConnectionOption().click();
      kserveModal.findLocationNameInput().type('Test Name');
      kserveModal.findLocationAccessKeyInput().type('test-key');
      kserveModal.findLocationSecretKeyInput().type('test-secret-key');
      kserveModal.findLocationEndpointInput().type('test-endpoint');
      kserveModal.findLocationBucketInput().type('test-bucket');
      kserveModal.findLocationPathInput().type('test-model/');
      kserveModal.findSubmitButton().should('be.enabled');

      // test submitting form, an error should appear
      kserveModal.findSubmitButton().click();

      cy.wait('@createServingRuntime').then((interceptions) => {
        expect(interceptions.request.url).to.include('?dryRun=All');
      });
      cy.wait('@createInferenceService').then((interceptions) => {
        expect(interceptions.request.url).to.include('?dryRun=All');
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
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'llama-service',
            displayName: 'Llama Service',
            modelName: 'llama-service',
            isModelMesh: false,
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

      projectDetails.visit('test-project');

      // click on the toggle button and open edit model server
      modelServingSection.getKServeRow('Llama Service').find().findKebabAction('Edit').click();

      kserveModal.shouldBeOpen();

      // Submit button should be enabled
      kserveModal.findSubmitButton().should('be.enabled');

      // Should allow editing
      kserveModal.findSubmitButton().click();
      kserveModal.shouldBeOpen(false);
    });

    it('KServe Model list', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: false,
      });
      projectDetails.visit('test-project');

      // Check that we get the correct model name
      modelServingSection
        .getKServeRow('Test Inference Service')
        .find()
        .findByText('OpenVINO Serving Runtime (Supports GPUs)')
        .should('exist');
      // Check for resource marked for deletion
      modelServingSection.getKServeRow('Another Inference Service').shouldBeMarkedForDeletion();
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

      projectDetails.visit('test-project');
      modelServingSection.getKServeRow('Llama Service').findExpansion().should(be.collapsed);
      modelServingSection.getKServeRow('Llama Service').findToggleButton().click();
      modelServingSection
        .findDescriptionListItem('Llama Service', 'Model server replicas')
        .next('dd')
        .should('have.text', '3');
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
      projectDetails.visit('test-project');

      modelServingSection.findAddModelServerButton().click();

      createServingRuntimeModal.shouldBeOpen();

      // test that you can not submit on empty
      createServingRuntimeModal.findSubmitButton().should('be.disabled');

      // test filling in minimum required fields
      createServingRuntimeModal.findModelServerNameInput().type('Test Name');
      createServingRuntimeModal
        .findServingRuntimeTemplateDropdown()
        .findDropdownItem('New OVMS Server')
        .click();
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

      projectDetails.visit('test-project');

      // click on the toggle button and open edit model server
      modelServingSection
        .getModelMeshRow('ovms')
        .find()
        .findKebabAction('Edit model server')
        .click();

      editServingRuntimeModal.shouldBeOpen();

      // test name field
      editServingRuntimeModal.findSubmitButton().should('be.disabled');
      editServingRuntimeModal.findModelServerNameInput().clear();
      editServingRuntimeModal.findModelServerNameInput().type('New name');
      editServingRuntimeModal.findSubmitButton().should('be.enabled');
      editServingRuntimeModal.findModelServerNameInput().clear();
      editServingRuntimeModal.findModelServerNameInput().type('test-model-legacy');
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
      editServingRuntimeModal.findAuthenticationCheckbox().uncheck();
      editServingRuntimeModal.findSubmitButton().should('be.disabled');
    });

    it('Successfully add model server when user can edit namespace', () => {
      initIntercepts({
        projectEnableModelMesh: undefined,
        disableKServeConfig: false,
        disableModelMeshConfig: false,
      });
      projectDetails.visit('test-project');

      modelServingSection.findAddModelServerButton().click();

      createServingRuntimeModal.shouldBeOpen();

      // fill in minimum required fields
      createServingRuntimeModal.findModelServerNameInput().type('Test Name');
      createServingRuntimeModal
        .findServingRuntimeTemplateDropdown()
        .findDropdownItem('New OVMS Server')
        .click();
      createServingRuntimeModal.findSubmitButton().should('be.enabled');

      // test submitting form, the modal should close to indicate success.
      createServingRuntimeModal.findSubmitButton().click();
      createServingRuntimeModal.shouldBeOpen(false);

      // the serving runtime should have been created
      cy.get('@createServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });
    });

    it('Do not add model server when user cannot edit namespace', () => {
      initIntercepts({
        projectEnableModelMesh: undefined,
        disableKServeConfig: false,
        disableModelMeshConfig: false,
        rejectAddSupportServingPlatformProject: true,
      });
      projectDetails.visit('test-project');

      modelServingSection.findAddModelServerButton().click();

      createServingRuntimeModal.shouldBeOpen();

      // fill in minimum required fields
      createServingRuntimeModal.findModelServerNameInput().type('Test Name');
      createServingRuntimeModal
        .findServingRuntimeTemplateDropdown()
        .findDropdownItem('New OVMS Server')
        .click();
      createServingRuntimeModal.findSubmitButton().should('be.enabled');

      // test submitting form, an error should appear
      createServingRuntimeModal.findSubmitButton().click();
      cy.findByText('Error creating model server');

      // the serving runtime should NOT have been created
      cy.get('@createServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(1); // 1 dry-run request only
      });
    });
  });

  describe('Model server with SericeAccount and RoleBinding', () => {
    it('Add model server - do not create ServiceAccount or RoleBinding if token auth is not selected', () => {
      initIntercepts({
        projectEnableModelMesh: undefined,
        disableKServeConfig: false,
        disableModelMeshConfig: false,
      });
      projectDetails.visit('test-project');

      modelServingSection.findAddModelServerButton().click();

      createServingRuntimeModal.shouldBeOpen();

      // fill in minimum required fields
      createServingRuntimeModal.findModelServerNameInput().type('Test Name');
      createServingRuntimeModal
        .findServingRuntimeTemplateDropdown()
        .findDropdownItem('New OVMS Server')
        .click();
      createServingRuntimeModal.findSubmitButton().should('be.enabled');

      // test submitting form, the modal should close to indicate success.
      createServingRuntimeModal.findSubmitButton().click();
      createServingRuntimeModal.shouldBeOpen(false);

      // the service account and role binding should not have been created
      cy.get('@createServiceAccount.all').then((interceptions) => {
        expect(interceptions).to.have.length(0);
      });
      cy.get('@createRoleBinding.all').then((interceptions) => {
        expect(interceptions).to.have.length(0);
      });
    });

    it('Add model server - create ServiceAccount and RoleBinding if token auth is selected', () => {
      initIntercepts({
        projectEnableModelMesh: undefined,
        disableKServeConfig: false,
        disableModelMeshConfig: false,
      });
      projectDetails.visit('test-project');

      modelServingSection.findAddModelServerButton().click();

      createServingRuntimeModal.shouldBeOpen();

      // fill in minimum required fields
      createServingRuntimeModal.findModelServerNameInput().type('Test Name');
      createServingRuntimeModal
        .findServingRuntimeTemplateDropdown()
        .findDropdownItem('New OVMS Server')
        .click();
      createServingRuntimeModal.findSubmitButton().should('be.enabled');

      // enable auth
      createServingRuntimeModal.findAuthenticationCheckbox().check();

      // test submitting form, the modal should close to indicate success.
      createServingRuntimeModal.findSubmitButton().click();
      createServingRuntimeModal.shouldBeOpen(false);

      // the service account and role binding should have been created
      cy.get('@createServiceAccount.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });
      cy.get('@createRoleBinding.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });
    });

    it('Add model server - do not create ServiceAccount or RoleBinding if they already exist', () => {
      initIntercepts({
        projectEnableModelMesh: undefined,
        disableKServeConfig: false,
        disableModelMeshConfig: false,
        serviceAccountAlreadyExists: true,
        roleBindingAlreadyExists: true,
      });
      projectDetails.visit('test-project');

      modelServingSection.findAddModelServerButton().click();

      createServingRuntimeModal.shouldBeOpen();

      // fill in minimum required fields
      createServingRuntimeModal.findModelServerNameInput().type('Test Name');
      createServingRuntimeModal
        .findServingRuntimeTemplateDropdown()
        .findDropdownItem('New OVMS Server')
        .click();
      createServingRuntimeModal.findSubmitButton().should('be.enabled');

      // enable auth
      createServingRuntimeModal.findAuthenticationCheckbox().check();

      // test submitting form, the modal should close to indicate success.
      createServingRuntimeModal.findSubmitButton().click();
      createServingRuntimeModal.shouldBeOpen(false);

      // the service account and role binding should have been created
      cy.get('@createServiceAccount.all').then((interceptions) => {
        expect(interceptions).to.have.length(0);
      });
      cy.get('@createRoleBinding.all').then((interceptions) => {
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
      projectDetails.visit('test-project');
      modelServingSection.getKServeRow('Llama Caikit').findExpansion().should(be.collapsed);
      modelServingSection.getKServeRow('Llama Caikit').findToggleButton().click();
      modelServingSection
        .findDescriptionListItem('Llama Caikit', 'Accelerator')
        .next('dd')
        .should('have.text', 'No accelerator enabled');
      modelServingSection
        .findDescriptionListItem('Llama Caikit', 'Number of accelerators')
        .should('not.exist');
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
            acceleratorIdentifier: 'nvidia.com/gpu',
          }),
        ],
      });
      projectDetails.visit('test-project');
      modelServingSection.getKServeRow('Llama Caikit').findExpansion().should(be.collapsed);
      modelServingSection.getKServeRow('Llama Caikit').findToggleButton().click();
      modelServingSection
        .findDescriptionListItem('Llama Caikit', 'Accelerator')
        .next('dd')
        .should('have.text', 'NVIDIA GPU (disabled)');
      modelServingSection
        .findDescriptionListItem('Llama Caikit', 'Number of accelerators')
        .should('exist');
    });

    it('Check accelerator when enabled but not selected', () => {
      initIntercepts({
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
        disableAccelerator: false,
      });
      projectDetails.visit('test-project');
      modelServingSection.getKServeRow('Llama Caikit').findExpansion().should(be.collapsed);
      modelServingSection.getKServeRow('Llama Caikit').findToggleButton().click();
      modelServingSection
        .findDescriptionListItem('Llama Caikit', 'Accelerator')
        .next('dd')
        .should('have.text', 'No accelerator selected');
      modelServingSection
        .findDescriptionListItem('Llama Caikit', 'Number of accelerators')
        .should('not.exist');
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
            acceleratorIdentifier: 'nvidia.com/gpu',
          }),
        ],
      });
      projectDetails.visit('test-project');
      modelServingSection.getKServeRow('Llama Caikit').findExpansion().should(be.collapsed);
      modelServingSection.getKServeRow('Llama Caikit').findToggleButton().click();
      modelServingSection
        .findDescriptionListItem('Llama Caikit', 'Accelerator')
        .next('dd')
        .should('have.text', 'NVIDIA GPU');
      modelServingSection
        .findDescriptionListItem('Llama Caikit', 'Number of accelerators')
        .should('exist');
    });
  });

  describe('Dry run check', () => {
    it('Check when inference service dryRun fails', () => {
      initIntercepts({
        disableModelMeshConfig: true,
        disableKServeConfig: false,
        servingRuntimes: [],
        rejectInferenceService: true,
      });

      projectDetails.visit('test-project');
      modelServingSection.findDeployModelButton().click();
      kserveModal.shouldBeOpen();

      // test filling in minimum required fields
      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateDropdown().findDropdownItem('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      kserveModal.findSubmitButton().should('be.disabled');
      kserveModal.findExistingConnectionSelect().findSelectOption('Test Secret').click();
      kserveModal.findLocationPathInput().type('test-model/');
      kserveModal.findSubmitButton().should('be.enabled');
      kserveModal.findSubmitButton().click();

      // check only dryRun should execute
      cy.get('@createInferenceService.all').then((interceptions) => {
        expect(interceptions).to.have.length(1); // 1 dry-run request only
      });

      // check url should be dryRun
      cy.wait('@createInferenceService').then((interceptions) => {
        expect(interceptions.request.url).to.include('?dryRun=All');
      });
    });

    it('Check when serving runtime dryRun fails', () => {
      initIntercepts({
        disableModelMeshConfig: true,
        disableKServeConfig: false,
        servingRuntimes: [],
        rejectServingRuntime: true,
      });

      projectDetails.visit('test-project');
      modelServingSection.findDeployModelButton().click();
      kserveModal.shouldBeOpen();

      // test filling in minimum required fields
      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateDropdown().findDropdownItem('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
      kserveModal.findSubmitButton().should('be.disabled');
      kserveModal.findExistingConnectionSelect().findSelectOption('Test Secret').click();
      kserveModal.findLocationPathInput().type('test-model/');
      kserveModal.findSubmitButton().should('be.enabled');
      kserveModal.findSubmitButton().click();

      // check only dryRun should execute
      cy.get('@createServingRuntime.all').then((interceptions) => {
        expect(interceptions).to.have.length(1); // 1 dry-run request only
      });

      // check url should be dryRun
      cy.wait('@createServingRuntime').then((interceptions) => {
        expect(interceptions.request.url).to.include('?dryRun=All');
      });
    });

    it('Check when Data connection secret dryRun fails', () => {
      initIntercepts({
        disableModelMeshConfig: true,
        disableKServeConfig: false,
        servingRuntimes: [],
        rejectDataConnection: true,
      });

      projectDetails.visit('test-project');
      modelServingSection.findDeployModelButton().click();
      kserveModal.shouldBeOpen();

      kserveModal.findModelNameInput().type('Test Name');
      kserveModal.findServingRuntimeTemplateDropdown().findDropdownItem('Caikit').click();
      kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();

      kserveModal.findNewDataConnectionOption().click();
      kserveModal.findLocationNameInput().type('Test Name');
      kserveModal.findLocationAccessKeyInput().type('test-key');
      kserveModal.findLocationSecretKeyInput().type('test-secret-key');
      kserveModal.findLocationEndpointInput().type('test-endpoint');
      kserveModal.findLocationBucketInput().type('test-bucket');
      kserveModal.findLocationPathInput().type('test-model/');

      kserveModal.findSubmitButton().should('be.enabled');
      kserveModal.findSubmitButton().click();

      cy.get('@createDataConnectionSecret.all').then((interceptions) => {
        expect(interceptions).to.have.length(1); // 1 dry-run request only
      });

      // check url should be dryRun
      cy.wait('@createDataConnectionSecret').then((interceptions) => {
        expect(interceptions.request.url).to.include('?dryRun=All');
      });

      // check no createInferenceService call is made as data connection creation failed
      cy.get('@createInferenceService.all').then((interceptions) => {
        expect(interceptions).to.have.length(0);
      });
    });
  });
});
