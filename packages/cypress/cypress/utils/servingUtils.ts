import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockSecretK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockSecretK8sResource';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
} from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';
import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import {
  mockNimInferenceService,
  mockNimProject,
  mockNimServingRuntime,
} from '@odh-dashboard/model-serving/__mocks__/mockLegacyNimResource';
import { mockOdhApplication } from '@odh-dashboard/k8s-core/__mocks__/mockOdhApplication';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import {
  InferenceServiceModel,
  NIMAccountModel,
  ProjectModel,
  SecretModel,
  ServingRuntimeModel,
} from './models';

export const initInterceptsForAllProjects = (): void => {
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
    }),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({
        k8sName: 'kserve-project',
        displayName: 'KServe Project',
        enableKServe: true,
      }),
      mockNimProject({
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
          displayName: 'KServe Model',
          namespace: 'kserve-project',
        }),
        mockNimServingRuntime(),
      ]),
    },
  );
  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: undefined },
    {
      body: mockK8sResourceList([
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
