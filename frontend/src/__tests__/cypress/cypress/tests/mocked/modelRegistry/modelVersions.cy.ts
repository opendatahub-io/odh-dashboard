/* eslint-disable camelcase */
import { mockK8sResourceList } from '~/__mocks__';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockModelVersionList } from '~/__mocks__/mockModelVersionList';
import { mockRegisteredModelList } from '~/__mocks__/mockRegisteredModelsList';
import { labelModal, modelRegistry } from '~/__tests__/cypress/cypress/pages/modelRegistry';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import { ServiceModel } from '~/__tests__/cypress/cypress/utils/models';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import { mockRegisteredModel } from '~/__mocks__/mockRegisteredModel';
import type { ModelVersion } from '~/concepts/modelRegistry/types';
import { mockModelVersion } from '~/__mocks__/mockModelVersion';
import { mockModelRegistryService } from '~/__mocks__/mockModelRegistryService';
import type { ServiceKind } from '~/k8sTypes';

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
      labels: [
        'Financial data',
        'Fraud detection',
        'Test label',
        'Machine learning',
        'Next data to be overflow',
        'Test label x',
        'Test label y',
        'Test label z',
      ],
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
      modelRegistries: [
        mockModelRegistryService({ name: 'modelRegistry-1' }),
        mockModelRegistryService({}),
      ],
    });

    modelRegistry.visit();
    modelRegistry.findModelRegistry().findSelectOption('modelregistry-sample').click();
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
