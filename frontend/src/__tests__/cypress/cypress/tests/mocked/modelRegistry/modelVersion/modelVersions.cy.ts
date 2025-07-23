/* eslint-disable camelcase */
import { mockDscStatus, mockK8sResourceList } from '#~/__mocks__';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockModelVersionList } from '#~/__mocks__/mockModelVersionList';
import { mockRegisteredModelList } from '#~/__mocks__/mockRegisteredModelsList';
import { labelModal, modelRegistry } from '#~/__tests__/cypress/cypress/pages/modelRegistry';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import { ServiceModel } from '#~/__tests__/cypress/cypress/utils/models';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';
import { mockRegisteredModel } from '#~/__mocks__/mockRegisteredModel';
import { ModelRegistryMetadataType, type ModelVersion } from '#~/concepts/modelRegistry/types';
import { mockModelVersion } from '#~/__mocks__/mockModelVersion';
import { mockModelRegistryService } from '#~/__mocks__/mockModelRegistryService';
import type { ServiceKind } from '#~/k8sTypes';

const MODEL_REGISTRY_API_VERSION = 'v1alpha3';

type HandlersProps = {
  disableModelRegistryFeature?: boolean;
  registeredModelsSize?: number;
  modelVersions?: ModelVersion[];
  modelRegistries?: ServiceKind[];
};

const initIntercepts = ({
  disableModelRegistryFeature = false,
  registeredModelsSize = 4,
  modelRegistries = [
    mockModelRegistryService({ name: 'modelregistry-sample' }),
    mockModelRegistryService({ name: 'modelregistry-sample-2' }),
  ],
  modelVersions = [
    mockModelVersion({
      author: 'Author 1',
      id: '1',
      customProperties: {
        'Financial data': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Fraud detection': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Test label': {
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
        'Test label x': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Test label y': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Test label z': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
      },
    }),
    mockModelVersion({ id: '2', name: 'model version' }),
  ],
}: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        'model-registry-operator': true,
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: disableModelRegistryFeature,
    }),
  );
  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
      },
    },
    mockModelVersionList({ items: modelVersions }),
  );

  cy.interceptK8sList(ServiceModel, mockK8sResourceList(modelRegistries));

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models`,
    { path: { serviceName: 'modelregistry-sample', apiVersion: MODEL_REGISTRY_API_VERSION } },
    mockRegisteredModelList({ size: registeredModelsSize }),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    mockModelVersionList({ items: modelVersions }),
  );

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
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    mockModelVersion({ id: '1', name: 'model version' }),
  );
};

describe('Model Versions', () => {
  it('No model versions in the selected registered model', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
      modelVersions: [],
    });

    modelRegistry.visit();
    const registeredModelRow = modelRegistry.getRow('Fraud detection model');
    registeredModelRow.findName().contains('Fraud detection model').click();
    verifyRelativeURL(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    modelRegistry.shouldmodelVersionsEmpty();
  });

  it('Model versions table browser back button should lead to Registered models table', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
    });

    modelRegistry.visit();
    const registeredModelRow = modelRegistry.getRow('Fraud detection model');
    registeredModelRow.findName().contains('Fraud detection model').click();
    verifyRelativeURL(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    cy.go('back');
    verifyRelativeURL(`/modelRegistry/modelregistry-sample`);
    registeredModelRow.findName().contains('Fraud detection model').should('exist');
  });

  it('Model versions table', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
      modelRegistries: [
        mockModelRegistryService({ name: 'modelRegistry-1' }),
        mockModelRegistryService({}),
      ],
    });

    modelRegistry.visit();
    modelRegistry
      .findModelRegistry()
      .findSelectOption('modelregistry-sample Model registry description')
      .click();
    cy.reload();
    const registeredModelRow = modelRegistry.getRow('Fraud detection model');
    registeredModelRow.findName().contains('Fraud detection model').click();
    verifyRelativeURL(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    modelRegistry.findModelBreadcrumbItem().contains('test');
    modelRegistry.findModelVersionsTableKebab().findDropdownItem('View archived versions');
    modelRegistry.findModelVersionsHeaderAction().findDropdownItem('Archive model');
    modelRegistry.findModelVersionsTable().should('be.visible');
    modelRegistry.findModelVersionsTableRows().should('have.length', 2);

    // Label modal
    const modelVersionRow = modelRegistry.getModelVersionRow('new model version');

    modelVersionRow.findLabelModalText().contains('5 more');
    modelVersionRow.findLabelModalText().click();
    labelModal.shouldContainsModalLabels([
      'Financial',
      'Financial data',
      'Fraud detection',
      'Test label',
      'Machine learning',
      'Next data to be overflow',
      'Test label x',
      'Test label y',
      'Test label y',
    ]);
    labelModal.findModalSearchInput().type('Financial');
    labelModal.shouldContainsModalLabels(['Financial', 'Financial data']);
    labelModal.findCloseModal().click();

    // sort by model version name
    modelRegistry.findModelVersionsTableHeaderButton('Version name').click();
    modelRegistry.findModelVersionsTableHeaderButton('Version name').should(be.sortAscending);
    modelRegistry.findModelVersionsTableHeaderButton('Version name').click();
    modelRegistry.findModelVersionsTableHeaderButton('Version name').should(be.sortDescending);

    // sort by Last modified
    modelRegistry.findModelVersionsTableHeaderButton('Last modified').click();
    modelRegistry.findModelVersionsTableHeaderButton('Last modified').should(be.sortAscending);
    modelRegistry.findModelVersionsTableHeaderButton('Last modified').click();
    modelRegistry.findModelVersionsTableHeaderButton('Last modified').should(be.sortDescending);

    // sort by model version author
    modelRegistry.findModelVersionsTableHeaderButton('Author').click();
    modelRegistry.findModelVersionsTableHeaderButton('Author').should(be.sortAscending);
    modelRegistry.findModelVersionsTableHeaderButton('Author').click();
    modelRegistry.findModelVersionsTableHeaderButton('Author').should(be.sortDescending);

    // filtering by keyword then both
    modelRegistry.findModelVersionsTableSearch().type('new model version');
    modelRegistry.findModelVersionsTableRows().should('have.length', 1);
    modelRegistry.findModelVersionsTableRows().contains('new model version');
    modelRegistry.findModelVersionsTableFilterOption('Author').click();
    modelRegistry.findModelVersionsTableSearch().type('Author 1');
    modelRegistry.findModelVersionsTableRows().should('have.length', 1);
    modelRegistry.findModelVersionsTableRows().contains('new model version');
    modelRegistry.findModelVersionsTableSearch().type('2');
    modelRegistry.findModelVersionsTableRows().should('have.length', 0);
    modelRegistry.findModelVersionsTableSearch().focused().clear();
    modelRegistry.findModelVersionsTableFilterOption('Keyword').click();
    modelRegistry.findModelVersionsTableSearch().click();
    modelRegistry.findModelVersionsTableSearch().focused().clear();

    // filtering by label then both
    modelRegistry.findModelVersionsTableSearch().type('Financial');
    modelRegistry.findModelVersionsTableRows().should('have.length', 1);
    modelRegistry.findModelVersionsTableRows().contains('new model version');
    modelRegistry.findModelVersionsTableFilterOption('Author').click();
    modelRegistry.findModelVersionsTableSearch().type('Author 1');
    modelRegistry.findModelVersionsTableRows().should('have.length', 1);
    modelRegistry.findModelVersionsTableRows().contains('new model version');
    modelRegistry.findModelVersionsTableSearch().type('2');
    modelRegistry.findModelVersionsTableRows().should('have.length', 0);
    modelRegistry.findModelVersionsTableSearch().focused().clear();
    modelRegistry.findModelVersionsTableFilterOption('Keyword').click();
    modelRegistry.findModelVersionsTableSearch().click();
    modelRegistry.findModelVersionsTableSearch().focused().clear();

    // filtering by model version author then both
    modelRegistry.findModelVersionsTableFilterOption('Author').click();
    modelRegistry.findModelVersionsTableSearch().type('Test author');
    modelRegistry.findModelVersionsTableRows().should('have.length', 1);
    modelRegistry.findModelVersionsTableRows().contains('Test author');
    modelRegistry.findModelVersionsTableFilterOption('Keyword').click();
    modelRegistry.findModelVersionsTableSearch().type('model version');
    modelRegistry.findModelVersionsTableRows().should('have.length', 1);
    modelRegistry.findModelVersionsTableRows().contains('model version');
    modelRegistry.findModelVersionsTableSearch().type('2');

    // searching with no matches shows no results screen
    modelRegistry.findModelVersionsTableRows().should('have.length', 0);
    modelRegistry.findModelRegistryEmptyTableState();
  });

  it('Model version details back button should lead to versions table', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
    });
    modelRegistry.visit();
    const registeredModelRow = modelRegistry.getRow('Fraud detection model');
    registeredModelRow.findName().contains('Fraud detection model').click();
    verifyRelativeURL(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('model version');
    modelVersionRow.findModelVersionName().contains('model version').click();
    verifyRelativeURL('/modelRegistry/modelregistry-sample/registeredModels/1/versions/1/details');
    cy.findByTestId('app-page-title').should('have.text', 'model version');
    cy.findByTestId('breadcrumb-version-name').should('have.text', 'model version');
    cy.go('back');
    verifyRelativeURL('/modelRegistry/modelregistry-sample/registeredModels/1/versions');
  });

  it('should show Lab tune option in kebab menu', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
    });

    // Enable fine-tuning feature
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableModelRegistry: false,
        disableFineTuning: false,
      }),
    );

    // Mock DSC status with required components
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        installedComponents: {
          'model-registry-operator': true,
          'data-science-pipelines-operator': true,
        },
      }),
    );

    modelRegistry.visit();
    const registeredModelRow = modelRegistry.getRow('Fraud detection model');
    registeredModelRow.findName().contains('Fraud detection model').click();

    const modelVersionRow = modelRegistry.getModelVersionRow('model version');
    modelVersionRow.findKebabAction('LAB-tune').click();
  });

  it('should show error in lab tune modal if loading artifacts failed', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
    });

    // Enable fine-tuning feature
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableModelRegistry: false,
        disableFineTuning: false,
      }),
    );

    // Mock DSC status with required components
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        installedComponents: {
          'model-registry-operator': true,
          'data-science-pipelines-operator': true,
        },
      }),
    );

    // Mock failing artifacts data
    cy.interceptOdh(
      'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts',
      {
        method: 'GET',
        path: {
          serviceName: 'modelregistry-sample',
          apiVersion: MODEL_REGISTRY_API_VERSION,
          modelVersionId: '1',
        },
      },
      { statusCode: 500 },
    );

    modelRegistry.visit();
    const registeredModelRow = modelRegistry.getRow('Fraud detection model');
    registeredModelRow.findName().contains('Fraud detection model').click();

    const modelVersionRow = modelRegistry.getModelVersionRow('model version');
    modelVersionRow.findKebabAction('LAB-tune').click();

    cy.findByText('Error loading model data').should('exist');
  });
});
