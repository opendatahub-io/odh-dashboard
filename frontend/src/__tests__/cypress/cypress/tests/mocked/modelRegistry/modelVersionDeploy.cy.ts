/* eslint-disable camelcase */
import {
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
import { mockConnectionTypeConfigMap } from '~/__mocks__/mockConnectionType';

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

  it('Pre-fill deployment information on KServe modal', () => {
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
    kserveModal.findExistingConnectionOption().should('be.checked');
    kserveModal.findLocationPathInput().should('exist');
  });

  it('One match connection on KServe modal', () => {
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
    kserveModal.findExistingConnectionSelectValueField().click();
    kserveModal.selectExistingConnectionSelectOptionByResourceName();
    kserveModal.findLocationPathInput().type('test-model/');
    kserveModal.findNewConnectionOption().click();
    kserveModal.findExistingConnectionSelect().should('have.attr', 'disabled');
    kserveModal.findConnectionNameInput().type('Test Name');
    kserveModal.findConnectionFieldInput().type('https://test');
  });
});
