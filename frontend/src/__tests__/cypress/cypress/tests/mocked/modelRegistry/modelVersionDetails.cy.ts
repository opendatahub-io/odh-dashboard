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
import { mockModelArtifact } from '~/__mocks__/mockModelArtifact';

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
import { ModelRegistryMetadataType, ModelState } from '~/concepts/modelRegistry/types';
import { KnownLabels } from '~/k8sTypes';

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
        mockModelVersion({
          author: 'Author 3',
          registeredModelId: '1',
          id: '3',
          name: 'Version 3',
          state: ModelState.ARCHIVED,
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
      modelVersionDetails.findVersionId().contains('1');
      modelVersionDetails.findModelVersionDropdownButton().click();
      modelVersionDetails.findModelVersionDropdownItem('Version 3').should('not.exist');
      modelVersionDetails.findModelVersionDropdownSearch().fill('Version 2');
      modelVersionDetails.findModelVersionDropdownItem('Version 2').click();
      modelVersionDetails.findVersionId().contains('2');
    });

    it('should handle label editing', () => {
      modelVersionDetails.findEditLabelsButton().click();

      modelVersionDetails.findAddLabelButton().click();
      cy.findByTestId('editable-label-group')
        .should('exist')
        .within(() => {
          cy.contains('New Label').should('exist').click();
          cy.focused().type('First Label{enter}');
        });

      modelVersionDetails.findAddLabelButton().click();
      cy.findByTestId('editable-label-group')
        .should('exist')
        .within(() => {
          cy.contains('New Label').should('exist').click();
          cy.focused().type('Second Label{enter}');
        });

      cy.findByTestId('editable-label-group').within(() => {
        cy.contains('First Label').should('exist').click();
        cy.focused().type('Updated First Label{enter}');
      });

      cy.findByTestId('editable-label-group').within(() => {
        cy.contains('Second Label').parent().find('[data-testid^="remove-label-"]').click();
      });

      modelVersionDetails.findSaveLabelsButton().should('exist').click();
    });

    it('should validate label length', () => {
      modelVersionDetails.findEditLabelsButton().click();

      const longLabel = 'a'.repeat(64);
      modelVersionDetails.findAddLabelButton().click();
      cy.findByTestId('editable-label-group')
        .should('exist')
        .within(() => {
          cy.contains('New Label').should('exist').click();
          cy.focused().type(`${longLabel}{enter}`);
        });

      cy.findByTestId('label-error-alert')
        .should('be.visible')
        .within(() => {
          cy.contains(`can't exceed 63 characters`).should('exist');
        });
    });

    it('should validate duplicate labels', () => {
      modelVersionDetails.findEditLabelsButton().click();

      modelVersionDetails.findAddLabelButton().click();
      cy.findByTestId('editable-label-group')
        .should('exist')
        .within(() => {
          cy.get('[data-testid^="editable-label-"]').last().click();
          cy.focused().type('{selectall}{backspace}Testing label{enter}');
        });

      modelVersionDetails.findAddLabelButton().click();
      cy.findByTestId('editable-label-group')
        .should('exist')
        .within(() => {
          cy.get('[data-testid^="editable-label-"]').last().click();
          cy.focused().type('{selectall}{backspace}Testing label{enter}');
        });

      cy.findByTestId('label-error-alert')
        .should('be.visible')
        .within(() => {
          cy.contains('Testing label already exists').should('exist');
        });
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
            additionalLabels: {
              [KnownLabels.REGISTERED_MODEL_ID]: '1',
              [KnownLabels.MODEL_VERSION_ID]: '1',
            },
          }),
          mockInferenceServiceK8sResource({
            url: 'test-inference-status.url.com',
            displayName: 'Test Inference Service-2',
            name: 'Test Inference Service-2',
            activeModelState: InferenceServiceModelState.LOADED,
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
            activeModelState: InferenceServiceModelState.LOADED,
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
      modelVersionDetails.visit();
    });

    it('should update source model format', () => {
      cy.interceptOdh(
        'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_artifacts/:artifactId',
        {
          path: {
            serviceName: 'modelregistry-sample',
            apiVersion: MODEL_REGISTRY_API_VERSION,
            artifactId: '1',
          },
        },
        mockModelArtifact({}),
      ).as('updateModelFormat');

      cy.interceptOdh(
        'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
        {
          path: {
            serviceName: 'modelregistry-sample',
            apiVersion: MODEL_REGISTRY_API_VERSION,
            registeredModelId: '1',
          },
        },
        mockRegisteredModel({}),
      );

      modelVersionDetails.findSourceModelFormat('edit').click();
      modelVersionDetails
        .findSourceModelFormat('group')
        .find('input')
        .clear()
        .type('UpdatedFormat');
      modelVersionDetails.findSourceModelFormat('save').click();

      cy.wait('@updateModelFormat').then((interception) => {
        expect(interception.request.body).to.deep.equal({
          modelFormatName: 'UpdatedFormat',
        });
      });
    });

    it('should update source model version', () => {
      cy.interceptOdh(
        'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_artifacts/:artifactId',
        {
          path: {
            serviceName: 'modelregistry-sample',
            apiVersion: MODEL_REGISTRY_API_VERSION,
            artifactId: '1',
          },
        },
        mockModelArtifact({}),
      ).as('updateModelVersion');

      cy.interceptOdh(
        'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
        {
          path: {
            serviceName: 'modelregistry-sample',
            apiVersion: MODEL_REGISTRY_API_VERSION,
            registeredModelId: '1',
          },
        },
        mockRegisteredModel({}),
      );

      modelVersionDetails.findSourceModelVersion('edit').click();
      modelVersionDetails.findSourceModelVersion('group').find('input').clear().type('2.0.0');
      modelVersionDetails.findSourceModelVersion('save').click();

      cy.wait('@updateModelVersion').then((interception) => {
        expect(interception.request.body).to.deep.equal({
          modelFormatVersion: '2.0.0',
        });
      });
    });
  });
});
