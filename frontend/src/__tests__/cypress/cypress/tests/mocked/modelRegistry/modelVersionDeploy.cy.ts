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
const modelArtifactMocked = mockModelArtifact();

const initIntercepts = ({
  registeredModelsSize = 4,
  modelVersions = [mockModelVersion({ id: '1', name: 'test model version' })],
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
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    mockModelArtifactList(),
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
};

describe('Deploy model version', () => {
  it('Deploy model version on unsupported platform', () => {
    initIntercepts({ kServeInstalled: false, modelMeshInstalled: false });
    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('Model mesh project');
    cy.findByText('Multi-model platform is not installed').should('exist');
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
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate name input field
    kserveModal
      .findModelNameInput()
      .should('contain.value', `${registeredModelMocked.name} - ${modelVersionMocked.name} - `);

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    cy.findByText('The source model format is').should('not.exist');
    kserveModal.findServingRuntimeTemplateDropdown().findSelectOption('Multi Platform').click();
    kserveModal.findModelFrameworkSelect().should('be.enabled');
    cy.findByText(
      `The source model format is ${modelArtifactMocked.modelFormatName} - ${modelArtifactMocked.modelFormatVersion}`,
    ).should('exist');

    // Validate data connection section
    cy.findByText(
      "We've auto-switched to create a new data connection and pre-filled the details for you.",
    ).should('exist');
    kserveModal.findNewDataConnectionOption().should('be.checked');
    kserveModal.findLocationNameInput().should('have.value', modelArtifactMocked.storageKey);
    kserveModal.findLocationBucketInput().should('have.value', 'test-bucket');
    kserveModal.findLocationRegionInput().should('have.value', 'test-region');
    kserveModal.findLocationEndpointInput().should('have.value', 'test-endpoint');
    kserveModal.findLocationPathInput().should('have.value', 'demo-models/test-path');
  });

  it('One match data connection on KServe modal', () => {
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

    // Validate data connection section
    kserveModal.findExistingDataConnectionOption().should('be.checked');
    kserveModal.findExistingConnectionSelect().should('contain.text', 'Test Secret');
    kserveModal.findLocationPathInput().should('have.value', 'demo-models/test-path');
  });

  it('More than one match data connections on KServe modal', () => {
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
          name: 'test-secret-2',
          displayName: 'Test Secret 2',
          namespace: 'kserve-project',
          s3Bucket: 'dGVzdC1idWNrZXQ=',
          endPoint: 'dGVzdC1lbmRwb2ludA==',
          region: 'dGVzdC1yZWdpb24=',
        }),
      ]),
    );

    cy.visit(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate data connection section
    kserveModal.findExistingDataConnectionOption().should('be.checked');
    kserveModal.findExistingConnectionSelect().should('contain.text', 'Select...');
    kserveModal.findLocationPathInput().should('have.value', 'demo-models/test-path');
  });
});
