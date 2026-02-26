import {
  mock404Error,
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockRoleBindingK8sResource,
  mockRoleK8sResource,
  mockSecretK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
} from '@odh-dashboard/internal/__mocks__/mockConnectionType';
import {
  mockGlobalScopedHardwareProfiles,
  mockProjectScopedHardwareProfiles,
} from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import {
  mockServingRuntimeTemplateK8sResource,
  mockInvalidTemplateK8sResource,
} from '@odh-dashboard/internal/__mocks__/mockServingRuntimeTemplateK8sResource';
import { ConnectionTypeFieldType } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { ServingRuntimePlatform } from '@odh-dashboard/internal/types';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { mockServiceAccountK8sResource } from '@odh-dashboard/internal/__mocks__/mockServiceAccountK8sResource';
import {
  HardwareProfileModel,
  NIMAccountModel,
  ProjectModel,
  RoleBindingModel,
  RoleModel,
  SecretModel,
  ServiceAccountModel,
  TemplateModel,
} from './models';

export const initDeployPrefilledModelIntercepts = ({
  disableKServe = false,
  disableNIMModelServing = true,
  disableProjectScoped = true,
  isEmpty = false,
}: {
  disableKServe?: boolean;
  disableNIMModelServing?: boolean;
  disableProjectScoped?: boolean;
  isEmpty?: boolean;
}): void => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: false,
      disableModelCatalog: false,
      disableProjectScoped,
      disableKServe,
      disableNIMModelServing,
    }),
  );

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        [DataScienceStackComponent.MODEL_REGISTRY]: { managementState: 'Managed' },
      },
    }),
  );

  // Enable NIM to show as a platform to select in a project
  if (!disableNIMModelServing) {
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
    mockK8sResourceList([
      mockProjectK8sResource({
        k8sName: 'kserve-project',
        displayName: 'KServe project',
      }),
      mockProjectK8sResource({ k8sName: 'test-project', displayName: 'Test project' }),
    ]),
  ).as('getProjects');

  cy.interceptK8sList(
    TemplateModel,
    isEmpty
      ? mockK8sResourceList([])
      : mockK8sResourceList(
          [
            mockServingRuntimeTemplateK8sResource({
              name: 'template-2',
              displayName: 'Caikit',
              platforms: [ServingRuntimePlatform.SINGLE],
            }),
            mockServingRuntimeTemplateK8sResource({
              name: 'template-3',
              displayName: 'OpenVINO',
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

  cy.interceptK8sList(
    TemplateModel,
    mockK8sResourceList(
      [
        mockServingRuntimeTemplateK8sResource({
          name: 'template-5',
          displayName: 'OpenVINO Local',
          platforms: [ServingRuntimePlatform.SINGLE],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-6',
          displayName: 'Caikit Local',
          platforms: [ServingRuntimePlatform.SINGLE],
          supportedModelFormats: [
            {
              autoSelect: true,
              name: 'openvino_ir',
              version: 'opset1',
            },
          ],
        }),
        mockInvalidTemplateK8sResource({}),
      ],
      { namespace: 'kserve-project' },
    ),
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
    mockConnectionTypeConfigMap({
      name: 's3',
      displayName: 'S3 compatible object storage - v1',
      description: 'description 2',
      category: ['existing-category'],
      fields: mockModelServingFields,
    }),
    mockConnectionTypeConfigMap({
      name: 'oci-v1',
      displayName: 'OCI compliant registry - v1',
      fields: [
        {
          name: 'Access type',
          type: ConnectionTypeFieldType.Dropdown,
          envVar: 'ACCESS_TYPE',
          required: false,
          properties: {
            variant: 'multi',
            items: [
              { label: 'Push secret', value: 'Push' },
              { label: 'Pull secret', value: 'Pull' },
            ],
          },
        },
        {
          name: 'Secret details',
          type: ConnectionTypeFieldType.File,
          envVar: '.dockerconfigjson',
          required: true,
          properties: { extensions: ['.dockerconfigjson, .json'] },
        },
        {
          name: 'Base URL / Registry URI',
          type: ConnectionTypeFieldType.ShortText,
          envVar: 'OCI_HOST',
          required: true,
          properties: {},
        },
      ],
    }),
  ]);

  cy.interceptK8sList(NIMAccountModel, mockK8sResourceList([mockNimAccount({})]));
};

/**
 *
 * Sets up:
 * `@createServiceAccount`
 * `@createRole`
 * `@createRoleBinding`
 * `@createServiceAccountSecret`
 * `@getServiceAccount`
 * `@getRole`
 * `@getRoleBinding`
 * `@getServiceAccountSecret`
 */
export const initMockModelAuthIntercepts = ({
  modelName = 'test-model',
  namespace = 'test-project',
  postResponse = 200,
  getResponse = 200,
  serviceAccountSecretName = 'default-name-${modelName}-sa', // {secret name}-{service account name}
}: {
  modelName?: string;
  namespace?: string;
  postResponse?: number;
  getResponse?: number;
  serviceAccountSecretName?: string;
}): void => {
  cy.interceptK8s(
    'POST',
    {
      model: ServiceAccountModel,
      ns: namespace,
    },
    {
      statusCode: postResponse,
      body: mockServiceAccountK8sResource({ name: `${modelName}-sa`, namespace }),
    },
  ).as('createServiceAccount');
  cy.interceptK8s(
    'POST',
    {
      model: RoleModel,
      ns: namespace,
    },
    {
      statusCode: postResponse,
      body: mockRoleK8sResource({ name: `${modelName}-view-role`, namespace }),
    },
  ).as('createRole');
  cy.interceptK8s(
    'POST',
    {
      model: RoleBindingModel,
      ns: namespace,
    },
    {
      statusCode: postResponse,
      body: mockRoleBindingK8sResource({ name: `${modelName}-view`, namespace }),
    },
  ).as('createRoleBinding');
  cy.interceptK8s(
    'POST',
    {
      model: SecretModel,
      ns: namespace,
      name: serviceAccountSecretName,
    },
    (req) => {
      if (req.body.type === 'kubernetes.io/service-account-token') {
        req.reply({
          statusCode: postResponse,
          body: mockSecretK8sResource({
            name: serviceAccountSecretName,
            namespace,
            type: 'kubernetes.io/service-account-token',
          }),
        });
      }
    },
  ).as('createServiceAccountSecret');

  cy.interceptK8s(
    'GET',
    {
      model: ServiceAccountModel,
      ns: namespace,
      name: `${modelName}-sa`,
    },
    getResponse === 404
      ? {
          statusCode: 404,
          body: mock404Error({}),
        }
      : {
          statusCode: getResponse,
          body: mockSecretK8sResource({ name: `${modelName}-sa`, namespace }),
        },
  ).as('getServiceAccount');

  cy.interceptK8s(
    'GET',
    {
      model: RoleModel,
      ns: namespace,
      name: `${modelName}-view-role`,
    },
    getResponse === 404
      ? {
          statusCode: 404,
          body: mock404Error({}),
        }
      : {
          statusCode: getResponse,
          body: mockRoleK8sResource({ name: `${modelName}-view-role`, namespace }),
        },
  ).as('getRole');

  cy.interceptK8s(
    'GET',
    {
      model: RoleBindingModel,
      ns: namespace,
      name: `${modelName}-view`,
    },
    getResponse === 404
      ? {
          statusCode: 404,
          body: mock404Error({}),
        }
      : {
          statusCode: getResponse,
          body: mockRoleBindingK8sResource({ name: `${modelName}-view`, namespace }),
        },
  ).as('getRoleBinding');

  cy.interceptK8s(
    'GET',
    {
      model: SecretModel,
      ns: namespace,
      name: serviceAccountSecretName,
    },
    (req) => {
      if (req.body.type === 'kubernetes.io/service-account-token') {
        req.reply(
          getResponse === 404
            ? {
                statusCode: 404,
                body: mock404Error({}),
              }
            : {
                statusCode: getResponse,
                body: mockSecretK8sResource({
                  name: serviceAccountSecretName,
                  namespace,
                  type: 'kubernetes.io/service-account-token',
                }),
              },
        );
      }
    },
  ).as('getServiceAccountSecret');
};

export const initMockConnectionSecretIntercepts = ({
  connectionSecretName = 'test-uri-connection-secret',
  namespace = 'test-project',
}: {
  connectionSecretName?: string;
  namespace?: string;
}): void => {
  cy.interceptK8s(
    'POST',
    { model: SecretModel, ns: namespace, name: connectionSecretName },
    (req) => {
      if (req.body.metadata?.annotations?.['opendatahub.io/connection-type-protocol']) {
        req.reply({
          statusCode: 200,
          body: mockSecretK8sResource({
            name: connectionSecretName,
            namespace,
          }),
        });
      }
    },
  ).as('createConnectionSecret');

  cy.interceptK8s(
    'GET',
    { model: SecretModel, ns: namespace, name: connectionSecretName },
    {
      statusCode: 200,
      body: mockSecretK8sResource({
        name: connectionSecretName,
        namespace,
      }),
    },
  ).as('getConnectionSecret');

  cy.interceptK8s(
    'PATCH',
    { model: SecretModel, ns: namespace, name: connectionSecretName },
    (req) => {
      if (req.body.metadata?.annotations?.['opendatahub.io/connection-type-protocol']) {
        req.reply({
          statusCode: 200,
          body: mockSecretK8sResource({
            name: connectionSecretName,
            namespace,
          }),
        });
      }
    },
  ).as('patchConnectionSecret');
};
