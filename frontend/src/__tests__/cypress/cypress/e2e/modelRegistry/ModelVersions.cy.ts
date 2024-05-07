/* eslint-disable camelcase */
import { mockK8sResourceList } from '~/__mocks__';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { MODEL_REGISTRY_API_VERSION } from '~/concepts/modelRegistry/const';
import { mockModelRegistry } from '~/__mocks__/mockModelRegistry';
import { mockModelVersionList } from '~/__mocks__/mockModelVersionList';
import { mockRegisteredModelList } from '~/__mocks__/mockRegisteredModelsList';
import { labelModal, modelRegistry } from '~/__tests__/cypress/cypress/pages/modelRegistry';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import { ModelRegistryModel } from '~/__tests__/cypress/cypress/utils/models';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import { mockRegisteredModel } from '~/__mocks__/mockRegisteredModel';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import { mockModelVersion } from '~/__mocks__/mockModelVersion';

type HandlersProps = {
  disableModelRegistryFeature?: boolean;
  registeredModelsSize?: number;
  modelVersions?: ModelVersion[];
};

const initIntercepts = ({
  disableModelRegistryFeature = false,
  registeredModelsSize = 4,
  modelVersions = [
    mockModelVersion({
      author: 'Author 1',
      id: '1',
      customProperties: {
        Financial: {
          metadataType: 'MetadataStringValue',
          string_value: 'non-empty',
        },
        'Financial data': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Fraud detection': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Test label': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Machine learning': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Next data to be overflow': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Test label x': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Test label y': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
        'Test label z': {
          metadataType: 'MetadataStringValue',
          string_value: '',
        },
      },
    }),
    mockModelVersion({ id: '2', name: 'model version' }),
  ],
}: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: disableModelRegistryFeature,
    }),
  );

  cy.interceptK8sList(
    ModelRegistryModel,
    mockK8sResourceList([mockModelRegistry({}), mockModelRegistry({ name: 'test-registry' })]),
  );

  cy.interceptK8s(ModelRegistryModel, mockModelRegistry({}));

  cy.interceptOdh(
    `GET /api/service/modelregistry/modelregistry-sample/api/model_registry/${MODEL_REGISTRY_API_VERSION}/registered_models`,
    mockRegisteredModelList({ size: registeredModelsSize }),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/modelregistry-sample/api/model_registry/${MODEL_REGISTRY_API_VERSION}/registered_models/1/versions`,
    mockModelVersionList({ items: modelVersions }),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/modelregistry-sample/api/model_registry/${MODEL_REGISTRY_API_VERSION}/registered_models/1`,
    mockRegisteredModel({}),
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

  it('Model versions table', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
    });

    modelRegistry.visit();
    const registeredModelRow = modelRegistry.getRow('Fraud detection model');
    registeredModelRow.findName().contains('Fraud detection model').click();
    verifyRelativeURL(`/modelRegistry/modelregistry-sample/registeredModels/1/versions`);
    modelRegistry.findModelBreadcrumbItem().contains('test');
    modelRegistry
      .findModelVersionsTableKebab()
      .findDropdownItem('View archived versions')
      .should('be.disabled');
    modelRegistry
      .findModelVersionsHeaderAction()
      .findDropdownItem('Archive model')
      .should('be.disabled');
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
    modelRegistry.findModelVersionsTableHeaderButton('Version name').should(be.sortAscending);
    modelRegistry.findModelVersionsTableHeaderButton('Version name').click();
    modelRegistry.findModelVersionsTableHeaderButton('Version name').should(be.sortDescending);

    // sort by model version owner
    modelRegistry.findModelVersionsTableHeaderButton('Owner').click();
    modelRegistry.findModelVersionsTableHeaderButton('Owner').should(be.sortAscending);
    modelRegistry.findModelVersionsTableHeaderButton('Owner').click();
    modelRegistry.findModelVersionsTableHeaderButton('Owner').should(be.sortDescending);

    // filtering by keyword
    modelRegistry.findModelVersionsTableSearch().type('new model version');
    modelRegistry.findModelVersionsTableRows().should('have.length', 1);
    modelRegistry.findModelVersionsTableRows().contains('new model version');
    modelRegistry.findModelVersionsTableSearch().focused().clear();

    // filtering by owner
    modelRegistry.findModelVersionsTableFilter().findDropdownItem('Owner').click();
    modelRegistry.findModelVersionsTableSearch().type('Test author');
    modelRegistry.findModelVersionsTableRows().should('have.length', 1);
    modelRegistry.findModelVersionsTableRows().contains('Test author');
  });
});
