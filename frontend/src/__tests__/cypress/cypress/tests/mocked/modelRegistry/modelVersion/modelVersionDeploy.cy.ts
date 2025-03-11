/* eslint-disable camelcase */
import {
  mockCustomSecretK8sResource,
  mockDscStatus,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockSecretK8sResource,
} from '~/__mocks__';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockRegisteredModelList } from '~/__mocks__/mockRegisteredModelsList';
import {
  NIMAccountModel,
  ProjectModel,
  SecretModel,
  ServiceModel,
  ServingRuntimeModel,
  TemplateModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { mockModelVersionList } from '~/__mocks__/mockModelVersionList';
import { mockModelVersion } from '~/__mocks__/mockModelVersion';
import type { ModelVersion } from '~/concepts/modelRegistry/types';
import { ModelState } from '~/concepts/modelRegistry/types';
import { mockRegisteredModel } from '~/__mocks__/mockRegisteredModel';
import { modelRegistry } from '~/__tests__/cypress/cypress/pages/modelRegistry';
import { mockModelRegistryService } from '~/__mocks__/mockModelRegistryService';
import { modelVersionDeployModal } from '~/__tests__/cypress/cypress/pages/modelRegistry/modelVersionDeployModal';
import { mockModelArtifactList } from '~/__mocks__/mockModelArtifactList';
import {
  mockInvalidTemplateK8sResource,
  mockServingRuntimeTemplateK8sResource,
} from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { ServingRuntimePlatform } from '~/types';
import { kserveModal } from '~/__tests__/cypress/cypress/pages/modelServing';
import { mockModelArtifact } from '~/__mocks__/mockModelArtifact';
import { mockNimAccount } from '~/__mocks__/mockNimAccount';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
} from '~/__mocks__/mockConnectionType';
import { ConnectionTypeFieldType } from '~/concepts/connectionTypes/types';

const MODEL_REGISTRY_API_VERSION = 'v1alpha3';

type HandlersProps = {
  registeredModelsSize?: number;
  modelVersions?: ModelVersion[];
  modelMeshInstalled?: boolean;
  kServeInstalled?: boolean;
};

const registeredModelMocked = mockRegisteredModel({ name: 'test-1' });
const modelVersionMocked = mockModelVersion({
  id: '1',
  name: 'test model version',
  state: ModelState.LIVE,
});
const modelVersionMocked2 = mockModelVersion({
  id: '2',
  name: 'model version'.repeat(15),
  state: ModelState.LIVE,
});
const modelArtifactMocked = mockModelArtifact();

const initIntercepts = ({
  registeredModelsSize = 4,
  modelVersions = [
    mockModelVersion({ id: '1', name: 'test model version' }),
    mockModelVersion({ id: '2', name: modelVersionMocked2.name }),
    mockModelVersion({ id: '3', name: 'test model version 2' }),
    mockModelVersion({ id: '4', name: 'test model version 3' }),
    mockModelVersion({ id: '5', name: 'test model version 4' }),
  ],
  modelMeshInstalled = true,
  kServeInstalled = true,
}: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: false,
    }),
  );
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        kserve: kServeInstalled,
        'model-mesh': modelMeshInstalled,
        'model-registry-operator': true,
      },
    }),
  );

  cy.interceptK8sList(
    ServiceModel,
    mockK8sResourceList([mockModelRegistryService({ name: 'modelregistry-sample' })]),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models',
    { path: { serviceName: 'modelregistry-sample', apiVersion: MODEL_REGISTRY_API_VERSION } },
    mockRegisteredModelList({ size: registeredModelsSize }),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    mockModelVersionList({
      items: modelVersions,
    }),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    registeredModelMocked,
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    modelVersionMocked,
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 2,
      },
    },
    modelVersionMocked2,
  );

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({
        enableModelMesh: true,
        k8sName: 'model-mesh-project',
        displayName: 'Model mesh project',
      }),
      mockProjectK8sResource({
        enableModelMesh: false,
        k8sName: 'kserve-project',
        displayName: 'KServe project',
      }),
      mockProjectK8sResource({ k8sName: 'test-project', displayName: 'Test project' }),
    ]),
  ).as('getProjects');

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    mockModelArtifactList({}),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 3,
      },
    },
    mockModelArtifactList({
      items: [mockModelArtifact({ uri: 'https://demo-models/some-path.zip' })],
    }),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 4,
      },
    },
    mockModelArtifactList({
      items: [mockModelArtifact({ uri: 'oci://test.io/test/private:test' })],
    }),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 5,
      },
    },
    mockModelArtifactList({
      items: [mockModelArtifact({ uri: 'oci://registry.redhat.io/rhel/private:test' })],
    }),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 2,
      },
    },
    mockModelArtifactList({}),
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

describe('Deploy model version', () => {
  it('Deploy model version on unsupported multi-model platform', () => {
    initIntercepts({ modelMeshInstalled: false });
    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version');
    modelVersionRow.findKebabAction('Deploy').click();
    cy.wait('@getProjects');
    modelVersionDeployModal.selectProjectByName('Model mesh project');
    cy.findByText('Multi-model platform is not installed').should('exist');
  });

  it('Deploy model version on unsupported single-model platform', () => {
    initIntercepts({ kServeInstalled: false });
    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version');
    modelVersionRow.findKebabAction('Deploy').click();
    cy.wait('@getProjects');
    modelVersionDeployModal.selectProjectByName('KServe project');
    cy.findByText('Single-model platform is not installed').should('exist');
  });

  it('Deploy model version on a project which platform is not selected', () => {
    initIntercepts({});
    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('Test project');
    cy.findByText('Cannot deploy the model until you select a model serving platform').should(
      'exist',
    );
  });

  it('Deploy model version on a model mesh project that has no model servers', () => {
    initIntercepts({});
    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version');
    modelVersionRow.findKebabAction('Deploy').click();
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([]));
    modelVersionDeployModal.selectProjectByName('Model mesh project');
    cy.findByText('Cannot deploy the model until you configure a model server').should('exist');
  });

  it('OCI info alert is visible in case of OCI models', () => {
    initIntercepts({});
    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 3');
    modelVersionRow.findKebabAction('Deploy').click();
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([]));
    cy.findByTestId('oci-deploy-kserve-alert').should('exist');
  });

  it('Selects Create Connection in case of no matching OCI connections', () => {
    initIntercepts({});
    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 3');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate name input field
    kserveModal.findModelNameInput().should('exist');

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    cy.findByText('The format of the source model is').should('not.exist');

    // Validate connection section
    kserveModal.findNewConnectionOption().should('be.checked');
    kserveModal.findModelURITextBox().should('have.value', 'test.io/test/private:test');
  });

  it('Selects Current URI in case of built-in registry OCI connections', () => {
    initIntercepts({});
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockCustomSecretK8sResource({
          namespace: 'kserve-project',
          name: 'test-secret',
          annotations: {
            'opendatahub.io/connection-type': 'oci-v1',
            'openshift.io/display-name': 'Test Secret',
          },
          data: {
            '.dockerconfigjson': 'aHR0cHM6Ly9kZW1vLW1vZGVscy9zb21lLXBhdGguemlw',
            OCI_HOST: 'cmVnaXN0cnkucmVkaGF0LmlvL3JoZWw=',
          },
        }),
      ]),
    );
    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 4');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate name input field
    kserveModal.findModelNameInput().should('exist');

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    cy.findByText('The format of the source model is').should('not.exist');

    // Validate connection section
    kserveModal.findExistingUriOption().should('be.checked');
    cy.findByText('oci://registry.redhat.io/rhel/private:test').should('exist');
  });

  it('Selects Create Connection in case of no matching connections', () => {
    initIntercepts({});
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockSecretK8sResource({
          name: 'test-secret-not-match',
          displayName: 'Test Secret Not Match',
          namespace: 'kserve-project',
          s3Bucket: 'dGVzdC1idWNrZXQ=',
          endPoint: 'dGVzdC1lbmRwb2ludC1ub3QtbWF0Y2g=', // endpoint not match
          region: 'dGVzdC1yZWdpb24=',
        }),
      ]),
    );
    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow(modelVersionMocked2.name);
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate name input field
    kserveModal.findModelNameInput().should('exist');

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    cy.findByText('The format of the source model is').should('not.exist');
    kserveModal.findServingRuntimeTemplateDropdown().findSelectOption('Multi Platform').click();
    kserveModal.findModelFrameworkSelect().should('be.enabled');
    cy.findByText(
      `The format of the source model is ${modelArtifactMocked.modelFormatName ?? ''} - ${
        modelArtifactMocked.modelFormatVersion ?? ''
      }`,
    ).should('exist');

    // Validate connection section
    kserveModal.findNewConnectionOption().should('be.checked');
    kserveModal.findLocationBucketInput().should('have.value', 'test-bucket');
    kserveModal.findLocationEndpointInput().should('have.value', 'test-endpoint');
    kserveModal.findLocationRegionInput().should('have.value', 'test-region');
    kserveModal.findLocationPathInput().should('have.value', 'demo-models/test-path');
  });

  it('Check whether all data is still persistent, if user changes connection types', () => {
    initIntercepts({});
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockSecretK8sResource({
          name: 'test-secret-not-match',
          displayName: 'Test Secret Not Match',
          namespace: 'kserve-project',
          s3Bucket: 'dGVzdC1idWNrZXQ=',
          endPoint: 'dGVzdC1lbmRwb2ludC1ub3QtbWF0Y2g=', // endpoint not match
          region: 'dGVzdC1yZWdpb24=',
        }),
      ]),
    );
    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow(modelVersionMocked2.name);
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate connection section
    kserveModal.findNewConnectionOption().should('be.checked');
    kserveModal.findLocationBucketInput().should('have.value', 'test-bucket');
    kserveModal.findLocationEndpointInput().should('have.value', 'test-endpoint');
    kserveModal.findLocationRegionInput().should('have.value', 'test-region');
    kserveModal.findLocationPathInput().should('have.value', 'demo-models/test-path');
    kserveModal.findLocationAccessKeyInput().type('test-access-key');
    kserveModal.findLocationSecretKeyInput().type('test-secret-key');

    kserveModal.selectConnectionType(
      'URI - v1 Connection type description Category: existing-category',
    );
    kserveModal.findConnectionFieldInput().type('http://test-uri');

    // switch the connection type to s3 to check whether all the data is still persistent
    kserveModal.selectConnectionType(
      'S3 compatible object storage - v1 description 2 Category: existing-category',
    );
    kserveModal.findLocationBucketInput().should('have.value', 'test-bucket');
    kserveModal.findLocationEndpointInput().should('have.value', 'test-endpoint');
    kserveModal.findLocationRegionInput().should('have.value', 'test-region');
    kserveModal.findLocationPathInput().should('have.value', 'demo-models/test-path');
    kserveModal.findLocationAccessKeyInput().should('have.value', 'test-access-key');
    kserveModal.findLocationSecretKeyInput().should('have.value', 'test-secret-key');

    //switch it back to uri
    kserveModal.selectConnectionType(
      'URI - v1 Connection type description Category: existing-category',
    );
    kserveModal.findConnectionFieldInput().should('have.value', 'http://test-uri');
  });

  it('Prefills when there is one s3 matching connection', () => {
    initIntercepts({});
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockSecretK8sResource({
          namespace: 'kserve-project',
          s3Bucket: 'dGVzdC1idWNrZXQ=',
          endPoint: 'dGVzdC1lbmRwb2ludA==',
          region: 'dGVzdC1yZWdpb24=',
        }),
        mockSecretK8sResource({
          name: 'test-secret-not-match',
          displayName: 'Test Secret Not Match',
          namespace: 'kserve-project',
          s3Bucket: 'dGVzdC1idWNrZXQ=',
          endPoint: 'dGVzdC1lbmRwb2ludC1ub3QtbWF0Y2g=', // endpoint not match
          region: 'dGVzdC1yZWdpb24=',
        }),
      ]),
    );

    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate connection section
    kserveModal.findExistingConnectionOption().should('be.checked');
    kserveModal.findExistingConnectionSelectValueField().should('have.value', 'Test Secret');
    kserveModal.findLocationPathInput().should('have.value', 'demo-models/test-path');
  });

  it('Prefills when there is one URI matching connection', () => {
    initIntercepts({});
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockCustomSecretK8sResource({
          namespace: 'kserve-project',
          name: 'test-secret',
          annotations: {
            'opendatahub.io/connection-type': 'uri-v1',
            'openshift.io/display-name': 'Test Secret',
          },
          data: { URI: 'aHR0cHM6Ly9kZW1vLW1vZGVscy9zb21lLXBhdGguemlw' },
        }),
      ]),
    );

    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 2');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate connection section
    kserveModal.findExistingConnectionOption().should('be.checked');
    kserveModal.findExistingConnectionSelectValueField().should('have.value', 'Test Secret');
  });

  it('Prefills when there is one OCI matching connection', () => {
    initIntercepts({});
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockCustomSecretK8sResource({
          namespace: 'kserve-project',
          name: 'test-secret',
          annotations: {
            'opendatahub.io/connection-type': 'oci-v1',
            'openshift.io/display-name': 'Test Secret',
          },
          data: {
            '.dockerconfigjson': 'aHR0cHM6Ly9kZW1vLW1vZGVscy9zb21lLXBhdGguemlw',
            OCI_HOST: 'dGVzdC5pby90ZXN0',
          },
        }),
      ]),
    );

    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 3');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate connection section
    kserveModal.findExistingConnectionOption().should('be.checked');
    cy.findByText('test.io/test').should('exist');
    kserveModal.findModelURITextBox().should('have.value', 'test.io/test/private:test');
  });

  it('Selects existing connection when there are 2 matching connections', () => {
    initIntercepts({});
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockCustomSecretK8sResource({
          namespace: 'kserve-project',
          name: 'test-secret',
          annotations: {
            'opendatahub.io/connection-type': 'uri-v1',
            'openshift.io/display-name': 'Test Secret',
          },
          data: { URI: 'aHR0cHM6Ly9kZW1vLW1vZGVscy9zb21lLXBhdGguemlw' },
        }),
        mockCustomSecretK8sResource({
          namespace: 'kserve-project',
          name: 'test-secret-2',
          annotations: {
            'opendatahub.io/connection-type': 'uri-v1',
            'openshift.io/display-name': 'Test Secret Match 2',
          },
          data: { URI: 'aHR0cHM6Ly9kZW1vLW1vZGVscy9zb21lLXBhdGguemlw' },
        }),
      ]),
    );

    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 2');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate connection section
    kserveModal.findExistingConnectionOption().should('be.checked');
    kserveModal.findExistingConnectionSelectValueField().should('be.empty');
    kserveModal
      .findExistingConnectionSelectValueField()
      .findSelectOption('Test Secret Recommended Type: URI - v1')
      .should('exist');
    kserveModal
      .findExistingConnectionSelectValueField()
      .findSelectOption('Test Secret Match 2 Recommended Type: URI - v1')
      .should('exist');
  });
});
