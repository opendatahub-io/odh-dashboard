/* eslint-disable camelcase */
import { mockDscStatus } from '~/__mocks__';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockModelCatalogConfigMap } from '~/__mocks__/mockModelCatalogConfigMap';
import { modelCatalog } from '~/__tests__/cypress/cypress/pages/modelCatalog';
import { ConfigMapModel } from '~/__tests__/cypress/cypress/utils/models';

type HandlersProps = {
  disableModelCatalogFeature?: boolean;
};

const initIntercepts = ({ disableModelCatalogFeature = false }: HandlersProps) => {
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
      name: 'model-catalog-source-redhat',
    },
    mockModelCatalogConfigMap(),
  );
};

describe('Model Catalog core', () => {
  it('Model Catalog Disabled in the cluster and URLs should not exist', () => {
    initIntercepts({
      disableModelCatalogFeature: true,
    });

    modelCatalog.landingPage();

    modelCatalog.tabDisabled();

    cy.visitWithLogin(`/modelCatalog`);
    modelCatalog.findModelCatalogNotFoundState().should('exist');
    cy.visitWithLogin(`/modelCatalog/tempDetails`);
    modelCatalog.findModelCatalogNotFoundState().should('exist');
  });

  it('Model Catalog Enabled in the cluster', () => {
    initIntercepts({
      disableModelCatalogFeature: false,
    });

    modelCatalog.landingPage();

    modelCatalog.tabEnabled();
  });

  it('Navigates to Model Catalog', () => {
    initIntercepts({ disableModelCatalogFeature: false });
    modelCatalog.visit();
    modelCatalog.navigate();
    modelCatalog.findModelCatalogCards().should('exist');
  });
});
