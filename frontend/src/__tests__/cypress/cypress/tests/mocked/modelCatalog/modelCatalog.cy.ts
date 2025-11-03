/* eslint-disable camelcase */
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { mockDscStatus } from '#~/__mocks__';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { modelCatalog } from '#~/__tests__/cypress/cypress/pages/modelCatalog/modelCatalog';
import { ConfigMapModel, ServiceModel } from '#~/__tests__/cypress/cypress/utils/models';
import { mockModelCatalogSource } from '#~/__mocks__/mockModelCatalogSource';
import {
  mockManagedModelCatalogConfigMap,
  mockUnmanagedModelCatalogConfigMap,
  mockConfigMap404Response,
} from '#~/__mocks__/mockModelCatalogConfigMap';
import { mockModelRegistryService } from '#~/__mocks__/mockModelRegistryService';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import type { ModelCatalogSource } from '#~/concepts/modelCatalog/types';
import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import { DataScienceStackComponent } from '#~/concepts/areas/types';

type HandlersProps = {
  modelRegistries?: K8sResourceCommon[];
  catalogSources?: ModelCatalogSource[];
  disableModelCatalogFeature?: boolean;
  hasUnmanagedSourcesConfigMap?: boolean;
  unmanagedSources?: ModelCatalogSource[];
  managedSources?: ModelCatalogSource[];
};

const initIntercepts = ({
  modelRegistries = [mockModelRegistryService({ name: 'modelregistry-sample' })],
  managedSources = [mockModelCatalogSource({})],
  unmanagedSources = [],
  disableModelCatalogFeature = false,
  hasUnmanagedSourcesConfigMap = true,
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
    'GET /api/config',
    mockDashboardConfig({
      disableModelCatalog: disableModelCatalogFeature,
    }),
  );

  // Mock the managed ConfigMap (Red Hat sources)
  cy.interceptK8s(
    {
      model: ConfigMapModel,
      ns: 'opendatahub',
      name: 'model-catalog-sources',
    },
    mockManagedModelCatalogConfigMap(managedSources),
  );

  if (hasUnmanagedSourcesConfigMap) {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-unmanaged-sources',
      },
      mockUnmanagedModelCatalogConfigMap(unmanagedSources),
    );
  } else {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-unmanaged-sources',
      },
      mockConfigMap404Response('model-catalog-unmanaged-sources'),
    );
  }

  cy.interceptK8sList(ServiceModel, mockK8sResourceList(modelRegistries));
};

describe('Model Catalog core', () => {
  it('Model Catalog Disabled in the cluster and URLs should not exist', () => {
    initIntercepts({
      disableModelCatalogFeature: true,
      hasUnmanagedSourcesConfigMap: false,
    });
    modelCatalog.landingPage();
    appChrome.findNavItem({ name: 'Catalog', rootSection: 'AI hub' }).should('not.exist');

    cy.visitWithLogin(`/ai-hub/catalog`);
    modelCatalog.findModelCatalogNotFoundState().should('exist');
    cy.visitWithLogin(`/ai-hub/catalog/tempDetails`);
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
    modelCatalog.visit();

    appChrome.findNavSection('AI hub').should('exist');

    modelCatalog.findModelCatalogCards().should('exist');
  });

  it('Navigates to Model Detail page on link click', () => {
    initIntercepts({ disableModelCatalogFeature: false });
    modelCatalog.visit();
    appChrome.findNavSection('AI hub').should('exist');

    modelCatalog.findModelCatalogCards().should('exist');
    modelCatalog.findModelCatalogModelDetailLink('granite-7b-redhat-lab').click();
    cy.location('pathname').should(
      'equal',
      '/ai-hub/catalog/redhat_ai_models/granite-7b-redhat-lab/overview',
    );
  });
});
