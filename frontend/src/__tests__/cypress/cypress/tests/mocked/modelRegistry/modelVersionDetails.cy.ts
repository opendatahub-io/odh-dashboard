/* eslint-disable camelcase */
import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockComponents,
  mockRegisteredModel,
  mockModelVersion,
  mockModelVersionList,
  mockModelArtifactList,
  mockModelRegistryService,
  mockServingRuntimeK8sResource,
  mockInferenceServiceK8sResource,
  mockProjectK8sResource,
  mockDscStatus,
} from '~/__mocks__';

import {
  InferenceServiceModel,
  ProjectModel,
  ServiceModel,
  ServingRuntimeModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import { modelVersionDetails } from '~/__tests__/cypress/cypress/pages/modelRegistry/modelVersionDetails';
import { InferenceServiceModelState } from '~/pages/modelServing/screens/types';
import { modelServingGlobal } from '~/__tests__/cypress/cypress/pages/modelServing';
import { ModelRegistryMetadataType } from '~/concepts/modelRegistry/types';

const MODEL_REGISTRY_API_VERSION = 'v1alpha3';
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
  },
});

const initIntercepts = () => {
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
        'model-registry-operator': true,
      },
    }),
  );

  cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());

  cy.interceptK8sList(
    ServiceModel,
    mockK8sResourceList([
      mockModelRegistryService({ name: 'modelregistry-sample' }),
      mockModelRegistryService({ name: 'modelregistry-sample-2' }),
    ]),
  );

  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },

    mockRegisteredModel({}),
  );

  cy.interceptOdh(
    `PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    mockModelVersions,
  ).as('UpdatePropertyRow');

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    mockModelVersionList({
      items: [
        mockModelVersion({ name: 'Version 1', author: 'Author 1', registeredModelId: '1' }),
        mockModelVersion({
          author: 'Author 2',
          registeredModelId: '1',
          id: '2',
          name: 'Version 2',
        }),
      ],
    }),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    mockModelVersions,
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 2,
      },
    },
    mockModelVersion({ id: '2', name: 'Version 2' }),
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
    mockModelArtifactList({}),
  );
};

describe('Model version details', () => {
  describe('Details tab', () => {
    beforeEach(() => {
      initIntercepts();
      modelVersionDetails.visit();
    });

    it('Model version details page header', () => {
      verifyRelativeURL(
        '/modelRegistry/modelregistry-sample/registeredModels/1/versions/1/details',
      );
      cy.findByTestId('app-page-title').should('have.text', 'Version 1');
      cy.findByTestId('breadcrumb-version-name').should('have.text', 'Version 1');
    });

    it('Model version details tab', () => {
      modelVersionDetails.findVersionId().contains('1');
      modelVersionDetails.findDescription().should('have.text', 'Description of model version');
      modelVersionDetails.findMoreLabelsButton().contains('6 more');
      modelVersionDetails.findMoreLabelsButton().click();
      modelVersionDetails.shouldContainsModalLabels([
        'Testing label',
        'Financial',
        'Financial data',
        'Fraud detection',
        'Machine learning',
        'Next data to be overflow',
        'Label x',
        'Label y',
        'Label z',
      ]);
      modelVersionDetails.findStorageEndpoint().contains('test-endpoint');
      modelVersionDetails.findStorageRegion().contains('test-region');
      modelVersionDetails.findStorageBucket().contains('test-bucket');
      modelVersionDetails.findStoragePath().contains('demo-models/test-path');
    });

    it('should add a property', () => {
      modelVersionDetails.findAddPropertyButton().click();
      modelVersionDetails.findAddKeyInput().type('new_key');
      modelVersionDetails.findAddValueInput().type('new_value');
      modelVersionDetails.findCancelButton().click();

      modelVersionDetails.findAddPropertyButton().click();
      modelVersionDetails.findAddKeyInput().type('new_key');
      modelVersionDetails.findAddValueInput().type('new_value');
      modelVersionDetails.findSaveButton().click();
      cy.wait('@UpdatePropertyRow');
    });

    it('should edit a property row', () => {
      modelVersionDetails.findExpandControlButton().should('have.text', 'Show 2 more properties');
      modelVersionDetails.findExpandControlButton().click();
      const propertyRow = modelVersionDetails.getRow('a6');
      propertyRow.find().findKebabAction('Edit').click();
      modelVersionDetails.findKeyEditInput('a6').clear().type('edit_key');
      modelVersionDetails.findValueEditInput('v1').clear().type('edit_value');

      modelVersionDetails.findCancelButton().click();
      propertyRow.find().findKebabAction('Edit').click();
      modelVersionDetails.findKeyEditInput('a6').clear().type('edit_key');
      modelVersionDetails.findValueEditInput('v1').clear().type('edit_value');
      modelVersionDetails.findSaveButton().click();
      cy.wait('@UpdatePropertyRow').then((interception) => {
        expect(interception.request.body).to.eql({
          customProperties: {
            a1: { metadataType: 'MetadataStringValue', string_value: 'v1' },
            a2: { metadataType: 'MetadataStringValue', string_value: 'v2' },
            a3: { metadataType: 'MetadataStringValue', string_value: 'v3' },
            a4: { metadataType: 'MetadataStringValue', string_value: 'v4' },
            a5: { metadataType: 'MetadataStringValue', string_value: 'v5' },
            a7: { metadataType: 'MetadataStringValue', string_value: 'v7' },
            'Testing label': { metadataType: 'MetadataStringValue', string_value: '' },
            'Financial data': { metadataType: 'MetadataStringValue', string_value: '' },
            'Fraud detection': { metadataType: 'MetadataStringValue', string_value: '' },
            'Long label data to be truncated abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc':
              { metadataType: 'MetadataStringValue', string_value: '' },
            'Machine learning': { metadataType: 'MetadataStringValue', string_value: '' },
            'Next data to be overflow': { metadataType: 'MetadataStringValue', string_value: '' },
            'Label x': { metadataType: 'MetadataStringValue', string_value: '' },
            'Label y': { metadataType: 'MetadataStringValue', string_value: '' },
            'Label z': { metadataType: 'MetadataStringValue', string_value: '' },
            edit_key: { string_value: 'edit_value', metadataType: 'MetadataStringValue' },
          },
        });
      });
    });

    it('should delete a property row', () => {
      modelVersionDetails.findExpandControlButton().should('have.text', 'Show 2 more properties');
      modelVersionDetails.findExpandControlButton().click();
      const propertyRow = modelVersionDetails.getRow('a6');
      modelVersionDetails.findPropertiesTableRows().should('have.length', 7);
      propertyRow.find().findKebabAction('Delete').click();
      cy.wait('@UpdatePropertyRow').then((interception) => {
        expect(interception.request.body).to.eql({
          customProperties: {
            a1: { metadataType: 'MetadataStringValue', string_value: 'v1' },
            a2: { metadataType: 'MetadataStringValue', string_value: 'v2' },
            a3: { metadataType: 'MetadataStringValue', string_value: 'v3' },
            a4: { metadataType: 'MetadataStringValue', string_value: 'v4' },
            a5: { metadataType: 'MetadataStringValue', string_value: 'v5' },
            a7: { metadataType: 'MetadataStringValue', string_value: 'v7' },
            'Testing label': { metadataType: 'MetadataStringValue', string_value: '' },
            'Financial data': { metadataType: 'MetadataStringValue', string_value: '' },
            'Fraud detection': { metadataType: 'MetadataStringValue', string_value: '' },
            'Long label data to be truncated abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc':
              { metadataType: 'MetadataStringValue', string_value: '' },
            'Machine learning': { metadataType: 'MetadataStringValue', string_value: '' },
            'Next data to be overflow': { metadataType: 'MetadataStringValue', string_value: '' },
            'Label x': { metadataType: 'MetadataStringValue', string_value: '' },
            'Label y': { metadataType: 'MetadataStringValue', string_value: '' },
            'Label z': { metadataType: 'MetadataStringValue', string_value: '' },
          },
        });
      });
    });

    it('Switching model versions', () => {
      modelVersionDetails.findVersionId().contains('1');
      modelVersionDetails.findModelVersionDropdownButton().click();
      modelVersionDetails.findModelVersionDropdownSearch().fill('Version 2');
      modelVersionDetails.findModelVersionDropdownItem('Version 2').click();
      modelVersionDetails.findVersionId().contains('2');
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
            activeModelState: InferenceServiceModelState.LOADED,
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
    });
  });
});
