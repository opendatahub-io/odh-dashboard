import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockDsciStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDsciStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';

export const API_VERSION = 'v1';
const REGISTRIES_NAMESPACE = 'odh-model-registries';

export const setupModelCatalogIntercepts = (): void => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.MODEL_REGISTRY]: {
          managementState: 'Managed',
          registriesNamespace: REGISTRIES_NAMESPACE,
        },
      },
    }),
  );

  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/user',
    { path: { apiVersion: API_VERSION } },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/namespaces',
    { path: { apiVersion: API_VERSION } },
    { data: [{ metadata: { name: REGISTRIES_NAMESPACE } }] },
  );

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/model_registry',
    { path: { apiVersion: API_VERSION } },
    { data: [] },
  );

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/model_catalog/sources',
    { path: { apiVersion: API_VERSION } },
    {
      data: {
        items: [
          {
            id: 'sample-source',
            name: 'Sample Source',
            enabled: true,
            labels: ['Community'],
            status: 'available',
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  );

  cy.intercept('GET', `**/model-registry/api/${API_VERSION}/model_catalog/labels*`, {
    body: {
      data: {
        items: [
          {
            name: 'Community',
            displayName: 'Community',
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });

  cy.intercept('GET', `**/model-registry/api/${API_VERSION}/model_catalog/models*`, {
    body: {
      data: {
        items: [
          {
            source_id: 'sample-source', // eslint-disable-line camelcase
            name: 'sample-model',
            description: 'Sample model',
            provider: 'provider1',
            license: 'apache-2.0',
            tasks: ['text-generation'],
            customProperties: {},
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });

  cy.intercept('GET', `**/model-registry/api/${API_VERSION}/model_catalog/models/filter_options*`, {
    body: {
      data: {
        filters: {},
      },
    },
  });
};
