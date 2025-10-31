import { mockRegisteredModelList } from '#~/__mocks__/mockRegisteredModelsList';
import { ModelRegistryMetadataType, ModelState } from '#~/concepts/modelRegistry/types';
import { mockRegisteredModel } from '#~/__mocks__/mockRegisteredModel';
import { mockModelVersionList } from '#~/__mocks__/mockModelVersionList';
import { mockModelVersion } from '#~/__mocks__/mockModelVersion';
import { archiveModelRegistry } from '#~/__tests__/cypress/cypress/pages/archiveModelRegistry';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockModelRegistry } from '#~/__mocks__';

const MODEL_REGISTRY_API_VERSION = 'v1';

const initIntercepts = ({
  registeredModels = [
    mockRegisteredModel({
      name: 'Fraud detection model',
      description:
        'A machine learning model trained to detect fraudulent transactions in financial data',
      customProperties: {
        'Financial data': {
          metadataType: ModelRegistryMetadataType.STRING,
          // eslint-disable-next-line camelcase
          string_value: '',
        },
      },
      state: ModelState.ARCHIVED,
    }),
  ],
  modelVersions = [
    mockModelVersion({
      name: 'model version 1',
      author: 'Author 1',
      id: '1',
    }),
  ],
}) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: false,
    }),
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
  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: [mockModelRegistry({ name: 'modelregistry-sample' })] },
  );
  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models`,
    {
      path: { modelRegistryName: 'modelregistry-sample', apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: mockRegisteredModelList({ items: registeredModels }) },
  );
  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
      },
    },
    { data: mockModelVersionList({ items: modelVersions }) },
  );
};

describe('Archive model registry', () => {
  beforeEach(() => {
    initIntercepts({});
  });

  it('The deployments option should not appear in the kebab options.', () => {
    archiveModelRegistry.visit();
    const archiveModelRow = archiveModelRegistry.getRow('Fraud detection model');
    archiveModelRow.findKebabAction('Deployments', false).should('not.exist');
  });
});
