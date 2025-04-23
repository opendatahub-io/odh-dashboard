import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { homePage } from '~/__tests__/cypress/cypress/pages/home/home';
import {
  mockConfigMap404Response,
  mockManagedModelCatalogConfigMap,
  mockModelCatalogConfigMap,
  mockUnmanagedModelCatalogConfigMap,
} from '~/__mocks__/mockModelCatalogConfigMap';
import type { ModelCatalogSource } from '~/concepts/modelCatalog/types';
import { ConfigMapModel, ServiceModel } from '~/__tests__/cypress/cypress/utils/models';
import { mockModelCatalogSource } from '~/__mocks__/mockModelCatalogSource';
import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockModelRegistryService,
} from '~/__mocks__';

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
      disableModelCatalog: disableModelCatalogFeature,
    }),
  );

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

describe('Homepage Model Catalog section', () => {
  beforeEach(() => {
    initIntercepts({ disableModelCatalogFeature: false });
  });

  it('should hide the model catalog section when disabled', () => {
    homePage.initHomeIntercepts({ disableModelCatalog: true });
    homePage.visit();
    homePage.getHomeModelCatalogSection().find().should('not.exist');
  });

  it('should hide the model catalog section when no models exist', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
      },
      {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: 'model-catalog-sources',
          namespace: 'opendatahub',
        },
        data: {
          modelCatalogSources: JSON.stringify({ sources: [] }),
        },
      },
    );
    homePage.visit();
    homePage.getHomeModelCatalogSection().find().should('not.exist');
  });

  it('should show the model catalog section when enabled and models exist', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
      },
      mockModelCatalogConfigMap(),
    );
    homePage.visit();
    homePage.getHomeModelCatalogSection().find().should('exist');
  });

  it('should show the hint and allow closing it', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
      },
      mockModelCatalogConfigMap(),
    );
    window.localStorage.setItem('odh.dashboard.model.catalog.hint', 'false');
    homePage.visit();
    const modelCatalogSection = homePage.getHomeModelCatalogSection();
    modelCatalogSection.getModelCatalogHint().should('be.visible');
    modelCatalogSection.getModelCatalogHintCloseButton().click();
    modelCatalogSection.getModelCatalogHint().should('not.exist');
  });

  it('should render correct number of model cards', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
      },
      mockModelCatalogConfigMap(),
    );
    homePage.visit();
    const modelCatalogSection = homePage.getHomeModelCatalogSection();
    modelCatalogSection.getModelCatalogCard().should('have.length', 1);
  });

  it('should show footer text with model count', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
      },
      mockModelCatalogConfigMap(),
    );
    homePage.visit();
    const modelCatalogSection = homePage.getHomeModelCatalogSection();
    modelCatalogSection.getModelCatalogFooter().should('contain', 'Showing all models');
  });

  it('should navigate to model catalog page', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
      },
      mockModelCatalogConfigMap(),
    );
    homePage.visit();
    const modelCatalogSection = homePage.getHomeModelCatalogSection();
    modelCatalogSection.getModelCatalogFooterLink().click();
    cy.url().should('include', '/modelCatalog');
  });
});
