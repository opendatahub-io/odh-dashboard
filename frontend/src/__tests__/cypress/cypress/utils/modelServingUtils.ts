import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockProjectK8sResource,
} from '#~/__mocks__';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
} from '#~/__mocks__/mockConnectionType';
import {
  mockGlobalScopedHardwareProfiles,
  mockProjectScopedHardwareProfiles,
} from '#~/__mocks__/mockHardwareProfile';
import { mockNimAccount } from '#~/__mocks__/mockNimAccount';
import {
  mockServingRuntimeTemplateK8sResource,
  mockInvalidTemplateK8sResource,
} from '#~/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  HardwareProfileModel,
  NIMAccountModel,
  ProjectModel,
  TemplateModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { ConnectionTypeFieldType } from '#~/concepts/connectionTypes/types';
import { ServingRuntimePlatform } from '#~/types';
import { DataScienceStackComponent } from '#~/concepts/areas/types';

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
          name: 'template-2',
          displayName: 'OpenVINO Local',
          platforms: [ServingRuntimePlatform.SINGLE],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-3',
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
