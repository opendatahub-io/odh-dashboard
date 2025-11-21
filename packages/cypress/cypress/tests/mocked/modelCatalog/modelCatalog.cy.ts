/* eslint-disable camelcase */
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { CatalogSource } from '@odh-dashboard/model-registry/types/modelCatalogTypes';
import {
  mockCatalogSource,
  mockCatalogSourceList,
} from '@odh-dashboard/model-registry/mocks/mockCatalogSourceList';
import {
  mockCatalogModelList,
  mockCatalogModel,
} from '@odh-dashboard/model-registry/mocks/mockCatalogModelList';
import { mockCatalogFilterOptionsList } from '@odh-dashboard/model-registry/mocks/mockCatalogFilterOptionsList';
import {
  mockCatalogPerformanceMetricsArtifact,
  mockCatalogModelArtifact,
  mockCatalogAccuracyMetricsArtifact,
  mockCatalogModelArtifactList,
} from '@odh-dashboard/model-registry/mocks/mockCatalogModelArtifactList';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockModelRegistryService } from '@odh-dashboard/internal/__mocks__/mockModelRegistryService';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { modelCatalog } from '../../../pages/modelCatalog/modelCatalog';
import { ServiceModel } from '../../../utils/models';
import { appChrome } from '../../../pages/appChrome';

const MODEL_CATALOG_API_VERSION = 'v1';
const MODEL_REGISTRY_API_VERSION = 'v1';

type HandlersProps = {
  modelRegistries?: K8sResourceCommon[];
  disableModelCatalogFeature?: boolean;
  sources?: CatalogSource[];
  modelsPerCategory?: number;
};

const initIntercepts = ({
  modelRegistries = [mockModelRegistryService({ name: 'modelregistry-sample' })],
  disableModelCatalogFeature = false,
  sources = [mockCatalogSource({}), mockCatalogSource({ id: 'source-2', name: 'source 2' })],
  modelsPerCategory = 4,
}: HandlersProps) => {
  // Ensure DSC status is mocked
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.MODEL_REGISTRY]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/user`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelCatalog: disableModelCatalogFeature,
    }),
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_catalog/sources`,
    {
      path: { apiVersion: MODEL_CATALOG_API_VERSION },
    },
    {
      data: mockCatalogSourceList({
        items: sources,
      }),
    },
  );

  sources.forEach((source) => {
    source.labels.forEach((label) => {
      cy.interceptOdh(
        `GET /model-registry/api/:apiVersion/model_catalog/models`,
        {
          path: { apiVersion: MODEL_CATALOG_API_VERSION },
          query: {
            sourceLabel: label,
          },
        },
        {
          data: mockCatalogModelList({
            items: Array.from({ length: modelsPerCategory }, (_, i) =>
              mockCatalogModel({
                name: `${label.toLowerCase()}-model-${i + 1}`,
                // eslint-disable-next-line camelcase
                source_id: source.id,
              }),
            ),
          }),
        },
      );
    });
  });

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_catalog/models/filter_options`,
    {
      path: { apiVersion: MODEL_CATALOG_API_VERSION },
    },
    { data: mockCatalogFilterOptionsList() },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_catalog/sources/:sourceId/artifacts/:modelName`,
    {
      path: {
        apiVersion: MODEL_CATALOG_API_VERSION,
        sourceId: 'source-2',
        modelName: 'sample%20category%201-model-1',
      },
    },
    {
      data: mockCatalogModelArtifactList({
        items: [
          mockCatalogPerformanceMetricsArtifact({}),
          mockCatalogAccuracyMetricsArtifact({}),
          mockCatalogModelArtifact({}),
        ],
      }),
    },
  );

  cy.interceptK8sList(ServiceModel, mockK8sResourceList(modelRegistries));
};

describe('Model Catalog core', () => {
  it('Model Catalog Disabled in the cluster and URLs should not exist', () => {
    initIntercepts({
      disableModelCatalogFeature: true,
    });
    modelCatalog.landingPage();
    appChrome.findNavItem({ name: 'Catalog', rootSection: 'AI hub' }).should('not.exist');

    cy.visitWithLogin(`/ai-hub/catalog`);
    modelCatalog.findModelCatalogNotFoundState().should('exist');
  });

  it('Model Catalog Enabled in the cluster', () => {
    initIntercepts({
      disableModelCatalogFeature: false,
    });
    modelCatalog.landingPage();
    appChrome.findNavItem({ name: 'Catalog', rootSection: 'AI hub' }).should('exist');
  });

  it('Navigates to Model Catalog', () => {
    initIntercepts({ disableModelCatalogFeature: false });

    modelCatalog.landingPage();
    appChrome.findNavItem({ name: 'Catalog', rootSection: 'AI hub' }).should('exist');
    appChrome.findNavItem({ name: 'Catalog', rootSection: 'AI hub' }).click();
    modelCatalog.findModelCatalogCards().should('exist');
  });

  it('Navigates to Model Detail page on link click', () => {
    initIntercepts({ disableModelCatalogFeature: false });
    modelCatalog.visit();
    modelCatalog.findModelCatalogCards().should('exist');
    modelCatalog.findModelCatalogModelDetailLink().click();
    cy.location('pathname').should(
      'equal',
      '/ai-hub/catalog/source-2/sample%20category%201-model-1/overview',
    );
  });
});
