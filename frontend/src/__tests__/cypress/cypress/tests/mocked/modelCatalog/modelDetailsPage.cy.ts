import { mockDashboardConfig, mockDscStatus } from '~/__mocks__';
import { mockModelCatalogConfigMap } from '~/__mocks__/mockModelCatalogConfigMap';
import { modelDetailsPage } from '~/__tests__/cypress/cypress/pages/modelDetailsPage';
import { ConfigMapModel } from '~/__tests__/cypress/cypress/utils/models';

const initIntercepts = () => {
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
      disableModelCatalog: false,
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

describe('Model details page', () => {
  beforeEach(() => {
    initIntercepts();
  });
  it('Model details page includes correct information', () => {
    modelDetailsPage.visit();
    modelDetailsPage
      .findLongDescription()
      .should(
        'have.text',
        'Granite-8B-Code-Instruct is a 8B parameter model fine tuned from\nGranite-8B-Code-Base on a combination of permissively licensed instruction\ndata to enhance instruction following capabilities including logical\nreasoning and problem-solving skills.',
      );
    modelDetailsPage
      .findModelCardMarkdown()
      .should('include.text', 'ibm-granite/granite-3.1-8b-base');
    modelDetailsPage.findModelVersion().should('include.text', '1.3.0');
    modelDetailsPage.findModelLicenseLink().should('have.text', 'Agreement');
    modelDetailsPage.findModelProvider().should('include.text', 'IBM');
    modelDetailsPage
      .findModelSourceImageLocation()
      .should(
        'have.text',
        'oci://registry.redhat.io/rhelai1/granite-8b-code-instruct:1.3-1732870892',
      );
  });
  it('Model details license links to correct place', () => {
    modelDetailsPage.visit();
    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen');
    });
    modelDetailsPage.findModelLicenseLink().click();
    cy.get('@windowOpen').should(
      'have.been.calledWith',
      'https://www.apache.org/licenses/LICENSE-2.0.txt',
    );
  });
});

describe('Model Details loading states', () => {
  beforeEach(() => {
    initIntercepts();
  });
  it('should show empty state when configmap is missing (404)', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-source-redhat',
      },
      {
        statusCode: 404,
        body: {
          kind: 'Status',
          apiVersion: 'v1',
          status: 'Failure',
          message: 'configmaps "model-catalog-source-redhat" not found',
          reason: 'NotFound',
          code: 404,
        },
      },
    );
    modelDetailsPage.visit();
    modelDetailsPage.findModelCatalogEmptyState().should('exist');
  });

  it('should show empty state when configmap has empty data', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-source-redhat',
      },
      {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: 'model-catalog-source-redhat',
          namespace: 'opendatahub',
        },
        data: { modelCatalogSource: '[]' },
      },
    );

    modelDetailsPage.visit();
    modelDetailsPage.findModelCatalogEmptyState().should('exist');
  });

  it('should show error state when configmap fetch fails (non-404)', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-source-redhat',
      },
      {
        statusCode: 500,
        body: {
          kind: 'Status',
          apiVersion: 'v1',
          status: 'Failure',
          message: 'Internal server error',
          reason: 'InternalError',
          code: 500,
        },
      },
    );

    modelDetailsPage.visit();
    cy.contains('Unable to load model catalog').should('exist');
  });

  it('should show error state when configmap has malformed data', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-source-redhat',
      },
      {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: 'model-catalog-source-redhat',
          namespace: 'opendatahub',
        },
        data: { modelCatalogSource: 'invalid JSON here' },
      },
    );

    modelDetailsPage.visit();
    cy.contains('Unable to load model catalog').should('exist');
  });

  it('should show model details when configmap has valid data', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-source-redhat',
      },
      mockModelCatalogConfigMap(),
    );

    modelDetailsPage.visit();
    modelDetailsPage.findLongDescription().should('exist');
  });
});
