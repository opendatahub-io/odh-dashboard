import { mockDefaultHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import {
  type MockDashboardConfigType,
  mockDashboardConfig,
} from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockSecretK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockSecretK8sResource';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mock200Status } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import {
  mockNimImages,
  mockNimInferenceService,
  mockNimModelPVC,
  mockNimProject,
  mockNimServingResource,
  mockNimServingRuntime,
  mockNimServingRuntimeTemplate,
  mockNvidiaNimAccessSecret,
  mockNvidiaNimImagePullSecret,
} from '@odh-dashboard/model-serving/__mocks__/mockLegacyNimResource';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import { mockOdhApplication } from '@odh-dashboard/k8s-core/__mocks__/mockOdhApplication';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { mockStorageClassList } from '@odh-dashboard/internal/__mocks__/mockStorageClasses';
import {
  ConfigMapModel,
  HardwareProfileModel,
  InferenceServiceModel,
  NIMAccountModel,
  ProjectModel,
  PVCModel,
  SecretModel,
  ServingRuntimeModel,
  StorageClassModel,
  TemplateModel,
} from './models';
import { initMockModelAuthIntercepts } from './modelServingUtils';

/* ###################################################
   ###### Interception Initialization Utilities ######
   ################################################### */

// intercept all APIs required for enabling NIM
export const initInterceptsToEnableNim = ({
  nimWizard = false,
}: { nimWizard?: boolean } = {}): void => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableKServe: false,
      disableNIMModelServing: false,
      nimWizard,
    }),
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
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockNimProject({})]));

  const templateMock = mockNimServingRuntimeTemplate();
  cy.interceptK8sList(TemplateModel, mockK8sResourceList([templateMock]));
  cy.interceptK8s(TemplateModel, templateMock);

  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList([mockDefaultHardwareProfile]),
  ).as('defaultHardwareProfile');
};

// intercept all APIs required for deploying new NIM models in existing projects
export const initInterceptsToDeployModel = (nimInferenceService: InferenceServiceKind): void => {
  cy.interceptK8s(ConfigMapModel, mockNimImages());
  cy.interceptK8s('POST', SecretModel, mockSecretK8sResource({}));
  cy.interceptK8s('POST', InferenceServiceModel, nimInferenceService).as('createInferenceService');

  cy.interceptK8s('POST', ServingRuntimeModel, mockNimServingRuntime()).as('createServingRuntime');

  cy.interceptOdh(
    `GET /api/nim-serving/:resource`,
    { path: { resource: 'nimConfig' } },
    mockNimServingResource(mockNimImages()),
  );

  cy.interceptOdh(
    `GET /api/nim-serving/:resource`,
    { path: { resource: 'apiKeySecret' } },
    mockNimServingResource(mockNvidiaNimAccessSecret()),
  );

  cy.interceptOdh(
    `GET /api/nim-serving/:resource`,
    { path: { resource: 'nimPullSecret' } },
    mockNimServingResource(mockNvidiaNimImagePullSecret()),
  );

  cy.interceptK8s('POST', PVCModel, mockNimModelPVC());
  cy.interceptK8s('GET', NIMAccountModel, mockNimAccount({}));
};

/**
 * Intercepts for deploying a legacy NIM model through the model deployment wizard.
 *
 * Layers on top of `initInterceptsToEnableNim({ nimWizard: true })` and sets up:
 * `@createInferenceService`, `@createServingRuntime`, plus the token auth resources
 * from `initMockModelAuthIntercepts`.
 */
export const initInterceptsToDeployNimInWizard = ({
  namespace = 'test-project',
  modelName = 'test-model',
}: {
  namespace?: string;
  modelName?: string;
} = {}): void => {
  // used by addSupportServingPlatformProject
  cy.interceptOdh(
    'GET /api/namespaces/:namespace/:context',
    { path: { namespace, context: '*' } },
    { applied: true },
  );
  cy.interceptOdh('GET /api/connection-types', []);

  // The wizard reads a project-scoped NIM account, and resolves the images config map and the
  // runtime template out of that account's own namespace.
  cy.interceptK8sList(
    { model: NIMAccountModel, ns: namespace },
    mockK8sResourceList([
      mockNimAccount({ namespace, runtimeTemplateName: 'odh-nim-account-template' }),
    ]),
  );
  cy.interceptK8s(ConfigMapModel, mockNimImages({ namespace }));
  cy.interceptK8s(
    TemplateModel,
    mockNimServingRuntimeTemplate({ namespace, name: 'odh-nim-account-template' }),
  );

  // NIM PVC caching field
  cy.interceptK8sList(StorageClassModel, mockStorageClassList());
  cy.interceptK8sList({ model: PVCModel, ns: namespace }, mockK8sResourceList([]));
  cy.interceptK8s('POST', { model: PVCModel, ns: namespace }, mockNimModelPVC()).as('createPVC');

  cy.interceptK8s(
    'POST',
    { model: InferenceServiceModel, ns: namespace },
    { statusCode: 200, body: mockNimInferenceService({ namespace }) },
  ).as('createInferenceService');

  cy.interceptK8s(
    'POST',
    { model: ServingRuntimeModel, ns: namespace },
    { statusCode: 200, body: mockNimServingRuntime() },
  ).as('createServingRuntime');

  initMockModelAuthIntercepts({
    modelName,
    namespace,
    getResponse: 404,
    // the wizard seeds the token auth field with a `default-token` named token
    serviceAccountSecretName: `default-token-${modelName}-sa`,
  });
};

// intercept all APIs required for deleting an existing NIM models
export const initInterceptsForDeleteModel = (): void => {
  // create initial inference and runtime
  cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
  cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

  // intercept delete inference request
  cy.interceptK8s(
    'DELETE',
    {
      model: InferenceServiceModel,
      ns: 'test-project',
      name: 'test-name',
    },
    mock200Status({}),
  ).as('deleteInference');

  // intercept delete runtime request
  cy.interceptK8s(
    'DELETE',
    {
      model: ServingRuntimeModel,
      ns: 'test-project',
      name: 'test-name',
    },
    mock200Status({}),
  ).as('deleteRuntime');
};

// intercept all APIs required for verifying NIM enablement
export const initInterceptorsValidatingNimEnablement = (
  dashboardConfig: MockDashboardConfigType,
  disableServingRuntime = false,
): void => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig(dashboardConfig));

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh('GET /api/components', null, [mockOdhApplication({})]);

  cy.interceptOdh(
    'GET /api/integrations/:internalRoute',
    { path: { internalRoute: 'nim' } },
    {
      isInstalled: true,
      isEnabled: !disableServingRuntime,
      canInstall: false,
      error: '',
    },
  );
  cy.interceptK8sList(NIMAccountModel, mockK8sResourceList([mockNimAccount({})]));

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ hasAnnotations: true })]),
  );

  // Template intercepts needed for platform selection UI
  const templateMock = mockNimServingRuntimeTemplate();
  cy.interceptK8sList(TemplateModel, mockK8sResourceList([templateMock]));
  cy.interceptK8s(TemplateModel, templateMock);
};
