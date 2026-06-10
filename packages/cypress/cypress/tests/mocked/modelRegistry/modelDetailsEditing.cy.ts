/* eslint-disable camelcase */

import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockModelVersionList,
  mockModelArtifactList,
} from '@odh-dashboard/internal/__mocks__';
import { mockDsciStatus } from '@odh-dashboard/internal/__mocks__/mockDsciStatus';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { mockRegisteredModel } from '@odh-dashboard/internal/__mocks__/mockRegisteredModel';
import { mockModelVersion } from '@odh-dashboard/internal/__mocks__/mockModelVersion';
import {
  mockModelRegistry,
  mockModelRegistryService,
} from '@odh-dashboard/internal/__mocks__/mockModelRegistryService';
import { ModelRegistryMetadataType } from '@odh-dashboard/internal/concepts/modelRegistry/types';
import {
  modelDetailsCard,
  modelDetailsExpandedCard,
} from '../../../pages/modelRegistry/modelDetailsCard';
import { modelVersionDetails } from '../../../pages/modelRegistry/modelVersionDetails';
import { ServiceModel } from '../../../utils/models';

const MODEL_REGISTRY_API_VERSION = 'v1';

const mockRegisteredModelWithData = mockRegisteredModel({
  name: 'Test Model',
  description: 'Test model description',
  owner: 'test-owner',
  customProperties: {
    label1: { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
    label2: { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
    property1: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'value1' },
    property2: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'value2' },
    'url-property': {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: 'https://example.com',
    },
  },
});

const mockModelVersionWithLabels = mockModelVersion({
  id: '1',
  name: 'Version 1',
  customProperties: {
    a1: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'v1' },
    a2: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'v2' },
    a3: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'v3' },
    a4: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'v4' },
    a5: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'v5' },
    a6: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'v1' },
    a7: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'v7' },
    'Testing label': { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
    'Financial data': { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
    'Fraud detection': { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
    'Long label data to be truncated abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc':
      { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
    'Machine learning': { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
    'Next data to be overflow': {
      metadataType: ModelRegistryMetadataType.STRING,
      string_value: '',
    },
    'Label x': { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
    'Label y': { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
    'Label z': { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
  },
});

const initIntercepts = () => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableModelRegistry: false }));
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.MODEL_REGISTRY]: {
          managementState: 'Managed',
          registriesNamespace: 'odh-model-registries',
        },
      },
    }),
  );
  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));
  cy.interceptK8sList(
    ServiceModel,
    mockK8sResourceList([mockModelRegistryService({ name: 'modelregistry-sample' })]),
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/user`,
    { path: { apiVersion: MODEL_REGISTRY_API_VERSION } },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry`,
    { path: { apiVersion: MODEL_REGISTRY_API_VERSION } },
    { data: [mockModelRegistry({ name: 'modelregistry-sample' })] },
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
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId/versions`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    {
      data: mockModelVersionList({
        items: [mockModelVersionWithLabels],
      }),
    },
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
    { data: mockModelVersionWithLabels },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    { data: mockModelArtifactList({}) },
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
    { data: mockModelVersionWithLabels },
  );

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
};

describe('Model details editing (useBlocker)', () => {
  beforeEach(() => {
    initIntercepts();
    cy.visitWithLogin('/ai-hub/models/registry/modelregistry-sample/registered-models/1/overview');
  });

  it('allows editing model description', () => {
    cy.findByText('Test model description').should('be.visible');

    modelDetailsCard.findDescriptionEditButton().click();
    modelDetailsCard.findDescriptionTextArea().should('be.visible');
    modelDetailsCard.findDescriptionTextArea().clear();
    modelDetailsCard.findDescriptionTextArea().type('Updated model description for testing');
    modelDetailsCard.findDescriptionSaveButton().click();

    cy.wait('@patchRegisteredModel').then((interception) => {
      expect(interception.request.body.data.description).to.equal(
        'Updated model description for testing',
      );
    });
  });
});

describe('Model version details editing (useBlocker)', () => {
  beforeEach(() => {
    initIntercepts();
    cy.visitWithLogin(
      '/ai-hub/models/registry/modelregistry-sample/registered-models/1/versions/1/details',
    );
  });

  it('should show alerts for the expanded section', () => {
    modelDetailsExpandedCard.findExpandedButton().click();
    modelDetailsExpandedCard.find().should('be.visible');
    modelDetailsExpandedCard.findLabelEditButton().click();
    modelDetailsExpandedCard.findAlert().should('exist');
    modelDetailsExpandedCard.findLabelSaveButton().click();
    modelDetailsExpandedCard.findDescriptionEditButton().click();
    modelDetailsExpandedCard.findAlert().should('exist');
    modelDetailsExpandedCard.findDescriptionSaveButton().click();
    modelDetailsExpandedCard.findPropertiesExpandableButton().click();
    const propertyRow = modelDetailsExpandedCard.getRow('property1');
    propertyRow.findKebabAction('Edit').click();
    modelDetailsExpandedCard.findAlert().should('exist');
    propertyRow.findSaveButton().click();
    modelDetailsExpandedCard.findAddPropertyButton().click();
    modelDetailsExpandedCard.findAlert().should('exist');
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

    modelVersionDetails.findSaveLabelsButton().should('be.visible').click();
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

    cy.findAllByTestId('label-error-alert')
      .eq(0)
      .should('be.visible')
      .within(() => {
        cy.contains(`can't exceed 63 characters`).should('exist');
      });

    cy.findAllByTestId('label-error-alert')
      .eq(1)
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
        cy.findAllByTestId(/^editable-label-/)
          .last()
          .click();
        cy.focused().type('{selectall}{backspace}Testing label{enter}');
      });

    modelVersionDetails.findAddLabelButton().click();
    cy.findByTestId('editable-label-group')
      .should('exist')
      .within(() => {
        cy.findAllByTestId(/^editable-label-/)
          .last()
          .click();
        cy.focused().type('{selectall}{backspace}Testing label{enter}');
      });

    cy.findAllByTestId('label-error-alert')
      .eq(0)
      .should('be.visible')
      .within(() => {
        cy.contains(/Testing label already exists|can't exceed 63 characters/).should('exist');
      });

    cy.findAllByTestId('label-error-alert')
      .eq(1)
      .should('be.visible')
      .within(() => {
        cy.contains(/Testing label already exists|can't exceed 63 characters/).should('exist');
      });
  });
});
