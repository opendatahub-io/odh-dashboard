import { homePage } from '~/__tests__/cypress/cypress/pages/home/home';
import { mockDscStatus } from '~/__mocks__';
import {
  mockConfigMap404Response,
  mockManagedModelCatalogConfigMap,
  mockUnmanagedModelCatalogConfigMap,
} from '~/__mocks__/mockModelCatalogConfigMap';
import type { ModelCatalogSource } from '~/concepts/modelCatalog/types';
import { ConfigMapModel, ServiceModel } from '~/__tests__/cypress/cypress/utils/models';
import { mockModelRegistryService } from '~/__mocks__/mockModelRegistryService';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockModelCatalogSource } from '~/__mocks__/mockModelCatalogSource';

const interceptDscStatus = () => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        'model-registry-operator': true,
      },
    }),
  );
};

const interceptConfigMapManagedResources = (mockModelCatalogSources: ModelCatalogSource[]) => {
  cy.interceptK8s(
    {
      model: ConfigMapModel,
      ns: 'opendatahub',
      name: 'model-catalog-sources',
    },
    mockManagedModelCatalogConfigMap(mockModelCatalogSources),
    // mockManagedModelCatalogConfigMap([mockModelCatalogSource({})]),
  );
};

const interceptConfigMapUnmanagedResources = (handleUnmanaged: boolean) => {
  if (handleUnmanaged) {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-unmanaged-sources',
      },
      mockUnmanagedModelCatalogConfigMap([]),
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
};

const interceptServiceModel = () => {
  cy.interceptK8sList(
    ServiceModel,
    mockK8sResourceList([mockModelRegistryService({ name: 'modelregistry-sample' })]),
  );
};

describe('Homepage Model Catalog section', () => {
  it('should hide the model catalog section when disabled', () => {
    interceptDscStatus();
    homePage.initHomeIntercepts({ disableModelCatalog: true });
    interceptConfigMapManagedResources([mockModelCatalogSource({})]);
    homePage.visit();

    homePage.getHomeModelCatalogSection().find().should('not.exist');
  });

  it('should hide the model catalog section when no models exist', () => {
    interceptDscStatus();
    homePage.initHomeIntercepts({ disableModelCatalog: false });
    interceptConfigMapManagedResources([]);
    homePage.visit();

    homePage.getHomeModelCatalogSection().find().should('not.exist');
  });

  it('should show the model catalog section when enabled and models exist', () => {
    interceptDscStatus();
    homePage.initHomeIntercepts({ disableModelCatalog: false });
    interceptConfigMapManagedResources([mockModelCatalogSource({})]);
    homePage.visit();

    homePage.getHomeModelCatalogSection().find().should('exist');
  });
});
