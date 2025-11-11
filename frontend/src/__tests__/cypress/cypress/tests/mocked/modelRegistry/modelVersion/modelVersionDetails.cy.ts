/* eslint-disable camelcase */
import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockRegisteredModel,
  mockModelVersion,
  mockModelVersionList,
  mockModelArtifactList,
  mockServingRuntimeK8sResource,
  mockInferenceServiceK8sResource,
  mockProjectK8sResource,
  mockDscStatus,
  mockModelRegistry,
} from '#~/__mocks__';
import { mockModelArtifact } from '#~/__mocks__/mockModelArtifact';

import {
  InferenceServiceModel,
  ProjectModel,
  ServingRuntimeModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';
import {
  modelVersionDetails,
  navigationBlockerModal,
} from '#~/__tests__/cypress/cypress/pages/modelRegistry/modelVersionDetails';
import { ModelDeploymentState } from '#~/pages/modelServing/screens/types';
import { modelServingGlobal } from '#~/__tests__/cypress/cypress/pages/modelServing';
import { ModelRegistryMetadataType, ModelSourceKind } from '#~/concepts/modelRegistry/types';
import { KnownLabels } from '#~/k8sTypes';
import { asProjectEditUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { DataScienceStackComponent } from '#~/concepts/areas/types';

const MODEL_REGISTRY_API_VERSION = 'v1';
const mockModelVersions = mockModelVersion({
  id: '1',
  name: 'Version 1',
  customProperties: {
    a1: {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: 'v1',
    },
    a2: {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: 'v2',
    },
    a3: {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: 'v3',
    },
    a4: {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: 'v4',
    },
    a5: {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: 'v5',
    },
    a6: {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: 'v1',
    },
    a7: {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: 'v7',
    },
    'Testing label': {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: '',
    },
    'Financial data': {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: '',
    },
    'Fraud detection': {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: '',
    },
    'Long label data to be truncated abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc':
      {
        metadataType: ModelRegistryMetadataType.STRING,
        string_value: '',
      },
    'Machine learning': {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: '',
    },
    'Next data to be overflow': {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: '',
    },
    'Label x': {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: '',
    },
    'Label y': {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: '',
    },
    'Label z': {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: '',
    },
    _registeredFromPipelineProject: {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: 'test-project',
    },
    _registeredFromPipelineRunId: {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: 'pipelinerun1',
    },
    _registeredFromPipelineRunName: {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: 'pipeline-run-test',
    },
  },
});

const mockRegisteredModelWithData = mockRegisteredModel({
  id: '1',
  name: 'Test Model',
  description: 'Test model description',
  owner: 'test-owner',
  customProperties: {
    label1: {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: '',
    },
    label2: {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: '',
    },
    property1: {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: 'value1',
    },
    property2: {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: 'value2',
    },
    'url-property': {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: 'https://example.com',
    },
  },
});

const initIntercepts = (
  isEmptyProject = false,
  fromCatalog = false,
  modelCatalogAvailable = true,
) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: false,
      disableFineTuning: false,
      disableModelCatalog: !modelCatalogAvailable,
    }),
  );

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.MODEL_REGISTRY]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList(!isEmptyProject ? [mockProjectK8sResource({})] : []),
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: [mockModelRegistry({ name: 'modelregistry-sample' })] },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    { data: mockModelVersion({ id: '1', name: 'Version 1' }) },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId/versions`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    { data: mockModelVersionList({ items: [mockModelVersion({ id: '1', name: 'Version 1' })] }) },
  );

  cy.interceptOdh(
    `PATCH /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    { data: mockModelVersions },
  ).as('UpdatePropertyRow');

  cy.interceptOdh(
    `PATCH /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    { data: mockRegisteredModelWithData },
  ).as('patchRegisteredModel');

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    {
      data: mockModelArtifactList({
        items: [
          mockModelArtifact(
            fromCatalog
              ? {
                  modelSourceClass: 'test-catalog-source',
                  modelSourceKind: ModelSourceKind.CATALOG,
                  modelSourceName: 'test-catalog-repo/test-catalog-model',
                }
              : {},
          ),
        ],
      }),
    },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    { data: mockRegisteredModelWithData },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/namespaces`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: [{ metadata: { name: 'odh-model-registries' } }] },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/user`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );
};

describe('Model version details', () => {
  describe('Details tab', () => {
    beforeEach(() => {
      initIntercepts(false, false);
      modelVersionDetails.visit();
    });

    it('Model version details registered from catalog', () => {
      initIntercepts(false, true, true);
      modelVersionDetails.visit();
      modelVersionDetails.findVersionId().contains('1');
      modelVersionDetails.findRegisteredFromCatalog().should('exist');
      modelVersionDetails.findRegisteredFromCatalog().should('have.text', 'test-catalog-model');
      modelVersionDetails.findRegisteredFromCatalog().click();
      verifyRelativeURL(
        `/ai-hub/catalog/test-catalog-source/${encodeURIComponent(
          'test-catalog-repo/test-catalog-model',
        )}`,
      );
    });

    it('Model version details registered from catalog with model catalog unavailable', () => {
      initIntercepts(false, true, false);
      modelVersionDetails.visit();
      modelVersionDetails.findVersionId().contains('1');
      modelVersionDetails.findRegisteredFromCatalog().should('exist');
      modelVersionDetails.findRegisteredFromTitle().should('exist');
    });

    // TODO: Unskip when pipeline is in model version details.
    it.skip('Model version details tab registered from pipeline', () => {
      modelVersionDetails.findVersionId().contains('1');
      modelVersionDetails.findRegisteredFromPipeline().should('exist');
      modelVersionDetails
        .findRegisteredFromPipeline()
        .should('have.text', 'Run pipeline-run-test inTest Project');
      modelVersionDetails.findDescription().should('have.text', 'Description of model version');
      modelVersionDetails.findPipelineRunLink().should('have.text', 'Run pipeline-run-test in');
      modelVersionDetails.findPipelineRunLink().click();
      verifyRelativeURL('/develop-train/pipelines/runs/test-project/runs/pipelinerun1');
    });

    // TODO: Unskip when pipeline is in model version details.
    it.skip('Pipeline run link unavailable for users without project access.', () => {
      asProjectEditUser();
      initIntercepts(true);
      modelVersionDetails.visit();
      modelVersionDetails.shouldNotHavePipelineRunLink();
      modelVersionDetails.findPipelineRunLink().should('contain.text', 'pipeline-run-test');
      modelVersionDetails.findProjectAccessInfoButton().click();
      modelVersionDetails.shouldHaveProjectAccessInfo();
    });
  });

  describe('Discard unsaved changes', () => {
    beforeEach(() => {
      initIntercepts();
      modelVersionDetails.visit();
    });

    // We do not have the delete modal yet.
    it.skip('should show discard modal when editing and moving to Deployments tab', () => {
      modelVersionDetails.findEditLabelsButton().click();
      modelVersionDetails.findAddLabelButton().click();
      cy.findByTestId('editable-label-group').within(() => {
        cy.contains('New Label').should('exist').click();
      });

      modelVersionDetails.findRegisteredDeploymentsTab().click();
      navigationBlockerModal.findDiscardUnsavedChanges().should('exist');
      navigationBlockerModal.findDiscardButton().click();
      modelVersionDetails.findDetailsTab().click();
    });

    // We do not have the delete modal yet.
    it.skip('should continue editing when clicking cancel', () => {
      modelVersionDetails.findEditLabelsButton().click();
      modelVersionDetails.findAddLabelButton().click();
      cy.findByTestId('editable-label-group').within(() => {
        cy.contains('New Label').should('exist').click();
      });

      modelVersionDetails.findRegisteredDeploymentsTab().click();
      navigationBlockerModal.findCloseModal().click();
      cy.findByTestId('editable-labels-group-save').should('exist');
    });
  });

  describe('Registered deployments tab', () => {
    beforeEach(() => {
      initIntercepts();
    });

    it('renders empty state when the version has no registered deployments', () => {
      cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([]));
      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([]));

      modelVersionDetails.visit();
      modelVersionDetails.findRegisteredDeploymentsTab().click();

      cy.findByTestId('model-version-deployments-empty-state').should('exist');
    });

    it('renders table with data', () => {
      cy.interceptK8sList(
        InferenceServiceModel,
        mockK8sResourceList([
          mockInferenceServiceK8sResource({
            url: 'test-inference-status.url.com',
            activeModelState: ModelDeploymentState.LOADED,
            additionalLabels: {
              [KnownLabels.REGISTERED_MODEL_ID]: '1',
              [KnownLabels.MODEL_VERSION_ID]: '1',
            },
          }),
          mockInferenceServiceK8sResource({
            url: 'test-inference-status.url.com',
            displayName: 'Test Inference Service-2',
            name: 'Test Inference Service-2',
            activeModelState: ModelDeploymentState.LOADED,
            additionalLabels: {
              [KnownLabels.REGISTERED_MODEL_ID]: '1',
              [KnownLabels.MODEL_VERSION_ID]: '1',
              [KnownLabels.MODEL_REGISTRY_NAME]: 'modelregistry-sample',
            },
          }),
          mockInferenceServiceK8sResource({
            url: 'test-inference-status.url.com',
            displayName: 'Test Inference Service-3',
            name: 'Test Inference Service-3',
            activeModelState: ModelDeploymentState.LOADED,
            additionalLabels: {
              [KnownLabels.REGISTERED_MODEL_ID]: '1',
              [KnownLabels.MODEL_VERSION_ID]: '1',
              [KnownLabels.MODEL_REGISTRY_NAME]: 'modelregistry-sample-1',
            },
          }),
        ]),
      );
      cy.interceptK8sList(
        ServingRuntimeModel,
        mockK8sResourceList([mockServingRuntimeK8sResource({})]),
      );

      modelVersionDetails.visit();
      modelVersionDetails.findRegisteredDeploymentsTab().click();

      modelServingGlobal.getModelRow('Test Inference Service').should('exist');
      modelServingGlobal.getModelRow('Test Inference Service-2').should('exist');
      modelServingGlobal.findRows().should('have.length', 2);
    });
  });

  describe('Model Version Details', () => {
    beforeEach(() => {
      initIntercepts();
      // Mock fine-tuning as enabled
      cy.interceptOdh(
        'GET /api/dsc/status',
        mockDscStatus({
          components: {
            [DataScienceStackComponent.MODEL_REGISTRY]: { managementState: 'Managed' },
            [DataScienceStackComponent.DS_PIPELINES]: { managementState: 'Managed' },
          },
        }),
      );
      modelVersionDetails.visit();
    });

    it('should update source model format', () => {
      cy.interceptOdh(
        'PATCH /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_artifacts/:artifactId',
        {
          path: {
            modelRegistryName: 'modelregistry-sample',
            apiVersion: MODEL_REGISTRY_API_VERSION,
            artifactId: '1',
          },
        },
        { data: mockModelArtifact({}) },
      ).as('updateModelFormat');

      modelVersionDetails.findSourceModelFormat('edit').click();
      modelVersionDetails
        .findSourceModelFormat('group')
        .find('input')
        .clear()
        .type('UpdatedFormat');
      modelVersionDetails.findSourceModelFormat('save').click();

      cy.wait('@updateModelFormat').then((interception) => {
        expect(interception.request.body.data).to.deep.equal({
          modelFormatName: 'UpdatedFormat',
        });
      });
    });

    it('should update source model version', () => {
      cy.interceptOdh(
        'PATCH /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_artifacts/:artifactId',
        {
          path: {
            modelRegistryName: 'modelregistry-sample',
            apiVersion: MODEL_REGISTRY_API_VERSION,
            artifactId: '1',
          },
        },
        { data: mockModelArtifact({}) },
      ).as('updateModelVersion');

      modelVersionDetails.findSourceModelVersion('edit').click();
      modelVersionDetails.findSourceModelVersion('group').find('input').clear().type('2.0.0');
      modelVersionDetails.findSourceModelVersion('save').click();

      cy.wait('@updateModelVersion').then((interception) => {
        expect(interception.request.body.data).to.deep.equal({
          modelFormatVersion: '2.0.0',
        });
      });
    });
  });

  describe('model serving is disabled', () => {
    beforeEach(() => {
      initIntercepts();
      // Mock fine-tuning as enabled
      cy.interceptOdh(
        'GET /api/dsc/status',
        mockDscStatus({
          components: {
            [DataScienceStackComponent.MODEL_REGISTRY]: { managementState: 'Managed' },
            [DataScienceStackComponent.DS_PIPELINES]: { managementState: 'Managed' },
          },
        }),
      );
      modelVersionDetails.visit();
    });

    it('should show the deploy button as disabled', () => {
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableModelServing: true,
        }),
      );
      modelVersionDetails.findDeployModelButton().click();
      cy.findByRole('tooltip').should(
        'contain.text',
        'To enable model serving, an administrator must first select a model serving platform in the cluster settings.',
      );
    });
  });
});
