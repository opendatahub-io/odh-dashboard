/* eslint-disable camelcase */
import { mockDscStatus } from '~/__mocks__';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { modelCatalog } from '~/__tests__/cypress/cypress/pages/modelCatalog';

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

  it('Navigates to Model Catalog and tempDetails', () => {
    initIntercepts({ disableModelCatalogFeature: false });
    modelCatalog.visit();
    modelCatalog.navigate();
    modelCatalog.findModelCatalogEmptyState().should('exist');
    modelCatalog.visitTempDetails();
    modelCatalog.findModelCatalogDetailsEmptyState().should('exist');
  });
});
