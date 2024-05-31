/* eslint-disable camelcase */
import { mockK8sResourceList, mockRouteK8sResourceModelRegistry } from '~/__mocks__';
import { mockComponents } from '~/__mocks__/mockComponents';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { MODEL_REGISTRY_API_VERSION } from '~/concepts/modelRegistry/const';
import { mockModelRegistry } from '~/__mocks__/mockModelRegistry';
import { mockRegisteredModelList } from '~/__mocks__/mockRegisteredModelsList';
import { labelModal, modelRegistry } from '~/__tests__/cypress/cypress/pages/modelRegistry';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import { ModelRegistryModel, RouteModel } from '~/__tests__/cypress/cypress/utils/models';
import { mockModelVersionList } from '~/__mocks__/mockModelVersionList';
import { mockModelVersion } from '~/__mocks__/mockModelVersion';
import { ModelVersion, RegisteredModel } from '~/concepts/modelRegistry/types';
import { mockRegisteredModel } from '~/__mocks__/mockRegisteredModel';

type HandlersProps = {
  disableModelRegistryFeature?: boolean;
  registeredModels?: RegisteredModel[];
  modelVersions?: ModelVersion[];
};

const initIntercepts = ({
  disableModelRegistryFeature = false,
  registeredModels = [
    mockRegisteredModel({
      name: 'Fraud detection model',
      description:
        'A machine learning model trained to detect fraudulent transactions in financial data',
      labels: [
        'Financial data',
        'Fraud detection',
        'Test label',
        'Machine learning',
        'Next data to be overflow',
      ],
    }),
    mockRegisteredModel({
      name: 'Label modal',
      description:
        'A machine learning model trained to detect fraudulent transactions in financial data',
      labels: [
        'Testing label',
        'Financial data',
        'Fraud detection',
        'Long label data to be truncated abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc',
        'Machine learning',
        'Next data to be overflow',
        'Label x',
        'Label y',
        'Label z',
      ],
    }),
  ],
  modelVersions = [
    mockModelVersion({ author: 'Author 1' }),
    mockModelVersion({ name: 'model version' }),
  ],
}: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: disableModelRegistryFeature,
    }),
  );
  cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());

  cy.interceptK8sList(
    ModelRegistryModel,
    mockK8sResourceList([mockModelRegistry({}), mockModelRegistry({ name: 'test-registry' })]),
  );

  cy.interceptK8s(ModelRegistryModel, mockModelRegistry({}));

  cy.interceptK8s(
    RouteModel,
    mockRouteK8sResourceModelRegistry({
      name: 'modelregistry-sample-http',
      namespace: 'odh-model-registries',
    }),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models`,
    {
      path: { serviceName: 'modelregistry-sample', apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    mockRegisteredModelList({ items: registeredModels }),
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
};

describe('Model Registry', () => {
  it('Model Registry Disabled in the cluster', () => {
    initIntercepts({
      disableModelRegistryFeature: true,
    });

    modelRegistry.landingPage();

    modelRegistry.tabDisabled();
  });

  it('Model Registry Enabled in the cluster', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
    });

    modelRegistry.landingPage();

    modelRegistry.tabEnabled();
  });

  it('No registered models in the selected Model Registry', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
      registeredModels: [],
    });

    modelRegistry.visit();
    modelRegistry.navigate();
    modelRegistry.shouldModelRegistrySelectorExist();
    modelRegistry.shouldregisteredModelsEmpty();
  });

  it('Registered model table', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
    });

    modelRegistry.visit();

    const registeredModelRow = modelRegistry.getRow('Fraud detection model');
    registeredModelRow.findName().contains('Fraud detection model');
    registeredModelRow
      .findDescription()
      .contains(
        'A machine learning model trained to detect fraudulent transactions in financial data',
      );
    registeredModelRow.findOwner().contains('Author 1');

    // Label popover
    registeredModelRow.findLabelPopoverText().contains('2 more');
    registeredModelRow.findLabelPopoverText().click();
    registeredModelRow.shouldContainsPopoverLabels([
      'Machine learning',
      'Next data to be overflow',
    ]);

    // Label modal
    const registeredModelRow2 = modelRegistry.getRow('Label modal');
    registeredModelRow2.findLabelModalText().contains('6 more');
    registeredModelRow2.findLabelModalText().click();
    labelModal.shouldContainsModalLabels([
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
    labelModal.findModalSearchInput().type('Financial');
    labelModal.shouldContainsModalLabels(['Financial', 'Financial data']);
    labelModal.findCloseModal().click();

    // sort by modelName
    modelRegistry.findRegisteredModelTableHeaderButton('Model name').should(be.sortAscending);
    modelRegistry.findRegisteredModelTableHeaderButton('Model name').click();
    modelRegistry.findRegisteredModelTableHeaderButton('Model name').should(be.sortDescending);

    // filtering by keyword
    modelRegistry.findTableSearch().type('Fraud detection model');
    modelRegistry.findTableRows().should('have.length', 1);
    modelRegistry.findTableRows().contains('Fraud detection model');
  });
});
