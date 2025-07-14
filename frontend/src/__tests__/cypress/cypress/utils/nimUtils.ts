import type { MockDashboardConfigType } from '#~/__mocks__';
import {
  mock200Status,
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockSecretK8sResource,
} from '#~/__mocks__';
import {
  AcceleratorProfileModel,
  ConfigMapModel,
  InferenceServiceModel,
  NIMAccountModel,
  ProjectModel,
  PVCModel,
  SecretModel,
  ServingRuntimeModel,
  TemplateModel,
} from '#~/__tests__/cypress/cypress/utils/models';
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
} from '#~/__mocks__/mockNimResource';
import { mockAcceleratorProfile } from '#~/__mocks__/mockAcceleratorProfile';
import type { InferenceServiceKind } from '#~/k8sTypes';
import { mockNimAccount } from '#~/__mocks__/mockNimAccount';
import { mockOdhApplication } from '#~/__mocks__/mockOdhApplication';

/* ###################################################
   ###### Interception Initialization Utilities ######
   ################################################### */

type EnableNimConfigType = {
  hasAllModels?: boolean;
};

// intercept all APIs required for enabling NIM
export const initInterceptsToEnableNim = ({ hasAllModels = false }: EnableNimConfigType): void => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        kserve: true,
        'model-mesh': true,
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableKServe: false,
      disableModelMesh: false,
      disableNIMModelServing: false,
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
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockNimProject({ hasAllModels })]));

  const templateMock = mockNimServingRuntimeTemplate();
  cy.interceptK8sList(TemplateModel, mockK8sResourceList([templateMock]));
  cy.interceptK8s(TemplateModel, templateMock);

  cy.interceptK8sList(
    AcceleratorProfileModel,
    mockK8sResourceList([mockAcceleratorProfile({ namespace: 'opendatahub' })]),
  );

  cy.interceptOdh('GET /api/accelerators', {
    configured: true,
    available: { 'nvidia.com/gpu': 1 },
    total: { 'nvidia.com/gpu': 1 },
    allocated: { 'nvidia.com/gpu': 1 },
  });
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

  cy.interceptOdh('GET /api/components', null, [mockOdhApplication({})]);

  cy.interceptOdh(
    'GET /api/integrations/:internalRoute',
    { path: { internalRoute: 'nim' } },
    {
      isInstalled: true,
      isEnabled: false,
      canInstall: false,
      error: '',
    },
  );
  cy.interceptK8sList(NIMAccountModel, mockK8sResourceList([mockNimAccount({})]));

  if (!disableServingRuntime) {
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
  }

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ hasAnnotations: true })]),
  );
};
