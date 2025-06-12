import {
  mockDashboardConfig,
  mockDscStatus,
  mockInferenceServiceK8sResource,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockSecretK8sResource,
  mockServingRuntimeK8sResource,
} from '#~/__mocks__';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
} from '#~/__mocks__/mockConnectionType';
import { mockNimAccount } from '#~/__mocks__/mockNimAccount';
import {
  mockNimInferenceService,
  mockNimProject,
  mockNimServingRuntime,
} from '#~/__mocks__/mockNimResource';
import { mockOdhApplication } from '#~/__mocks__/mockOdhApplication';
import {
  InferenceServiceModel,
  NIMAccountModel,
  ProjectModel,
  SecretModel,
  ServingRuntimeModel,
} from '#~/__tests__/cypress/cypress/utils/models';

export const initInterceptsForAllProjects = (): void => {
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
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({
        k8sName: 'model-mesh-project',
        displayName: 'Model Mesh Project',
        enableModelMesh: true,
      }),
      mockProjectK8sResource({
        k8sName: 'kserve-project',
        displayName: 'KServe Project',
        enableModelMesh: false,
      }),
      mockNimProject({
        hasAllModels: false,
        k8sName: 'nim-project',
        displayName: 'NIM Project',
        enableNIM: true,
      }),
    ]),
  );
  cy.interceptK8sList(
    { model: ServingRuntimeModel, ns: undefined },
    {
      body: mockK8sResourceList([
        mockServingRuntimeK8sResource({
          displayName: 'Model Mesh Model',
          namespace: 'model-mesh-project',
        }),
        mockServingRuntimeK8sResource({
          displayName: 'KServe Model',
          namespace: 'kserve-project',
        }),
        mockNimServingRuntime(),
      ]),
    },
  );
  cy.interceptK8sList(
    ServingRuntimeModel,
    mockK8sResourceList([
      mockServingRuntimeK8sResource({
        displayName: 'Model Mesh Model',
        namespace: 'model-mesh-project',
      }),
    ]),
  );
  cy.interceptK8s(
    ServingRuntimeModel,
    mockServingRuntimeK8sResource({
      displayName: 'Model Mesh Model',
      namespace: 'model-mesh-project',
    }),
  );
  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: undefined },
    {
      body: mockK8sResourceList([
        mockInferenceServiceK8sResource({
          displayName: 'Model Mesh Model',
          namespace: 'model-mesh-project',
          isModelMesh: true,
        }),
        mockInferenceServiceK8sResource({
          displayName: 'KServe Model',
          namespace: 'kserve-project',
        }),
        mockNimInferenceService({
          displayName: 'NIM Model',
          namespace: 'nim-project',
        }),
      ]),
    },
  );
  cy.interceptK8sList(
    SecretModel,
    mockK8sResourceList([mockSecretK8sResource({ namespace: 'kserve-project' })]),
  );
  cy.interceptOdh('GET /api/connection-types', [
    mockConnectionTypeConfigMap({
      name: 's3',
      displayName: 'S3 compatible object storage - v1',
      description: 'description 2',
      category: ['existing-category'],
      fields: mockModelServingFields,
    }),
  ]);

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
};
