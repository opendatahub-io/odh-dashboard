/* eslint-disable camelcase */
import { mockDscStatus } from '~/__mocks__';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockModelCatalogConfigMap } from '~/__mocks__/mockModelCatalogConfigMap';
import { modelCatalog } from '~/__tests__/cypress/cypress/pages/modelCatalog/modelCatalog';
import { ConfigMapModel } from '~/__tests__/cypress/cypress/utils/models';
import { mockModelCatalogSource } from '~/__mocks__/mockModelCatalogSource';
import {
  mockRedHatModel,
  mockThirdPartyModel,
  mockCatalogModel,
} from '~/__mocks__/mockCatalogModel';

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
      name: 'model-catalog-sources',
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

    cy.findByRole('button', { name: 'Models' }).click();
    cy.findByRole('link', { name: 'Model catalog' }).should('not.exist');

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

    cy.findByRole('button', { name: 'Models' }).click();
    cy.findByRole('link', { name: 'Model catalog' }).should('exist');
  });

  it('Navigates to Model Catalog', () => {
    initIntercepts({ disableModelCatalogFeature: false });
    modelCatalog.visit();

    cy.findByRole('button', { name: 'Models' }).should('exist').click();

    cy.findByTestId('model-catalog-cards').should('exist');
  });

  it('Navigates to Model Detail page on link click', () => {
    initIntercepts({ disableModelCatalogFeature: false });
    modelCatalog.visit();
    cy.findByRole('button', { name: 'Models' }).should('exist').click();

    cy.findByTestId('model-catalog-cards').should('exist');

    modelCatalog.findModelCatalogModelDetailLink('granite-8b-code-instruct').click();
    cy.location('pathname').should(
      'equal',
      '/modelCatalog/Red%20Hat/rhelai1/granite-8b-code-instruct/1%252E3%252E0',
    );
  });
});

describe('Model Catalog loading states', () => {
  beforeEach(() => {
    initIntercepts({ disableModelCatalogFeature: false });
  });

  it('should show empty state when configmap is missing (404)', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
      },
      {
        statusCode: 404,
        body: {
          kind: 'Status',
          apiVersion: 'v1',
          status: 'Failure',
          message: 'configmaps "model-catalog-sources" not found',
          reason: 'NotFound',
          code: 404,
        },
      },
    );

    modelCatalog.visit();
    modelCatalog.findModelCatalogEmptyState().should('exist');
  });

  it('should show error state when configmap fetch fails (non-404)', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
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

    modelCatalog.visit();
    cy.contains('Unable to load model catalog').should('exist');
  });

  it('should show empty state when configmap has empty data', () => {
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
          modelCatalogSources: '',
        },
      },
    );
    modelCatalog.visit();
    modelCatalog.findModelCatalogEmptyState().should('exist');
  });

  it('should show empty state when configmap has malformed data', () => {
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
        data: { modelCatalogSources: 'invalid JSON here' },
      },
    );

    modelCatalog.visit();
    cy.contains('Unable to load model catalog').should('exist');
  });

  it('should show model catalog when configmap has valid data', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
      },
      mockModelCatalogConfigMap(),
    );

    modelCatalog.visit();
    modelCatalog.findModelCatalogCards().should('exist');
  });
});

describe('Model catalog cards', () => {
  beforeEach(() => {
    initIntercepts({ disableModelCatalogFeature: false });
  });

  it('should show labels, including reserved ILAB labels correctly', () => {
    const model2 = mockCatalogModel({
      name: 'test-model-1',
      labels: ['lab-base', 'lab-teacher', 'lab-judge', 'label1'],
      tasks: ['task1', 'task2'],
    });

    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
      },
      mockModelCatalogConfigMap([mockModelCatalogSource({ models: [model2] })]),
    );

    modelCatalog.visit();
    cy.findByTestId('model-catalog-cards', { timeout: 15000 }).should('exist');

    // Find the specific model card
    cy.contains('[data-testid=model-catalog-card]', 'test-model-1').within(() => {
      // Check ILAB labels in the label group
      cy.findByTestId('model-catalog-label-group').within(() => {
        cy.findByText('LAB starter').should('exist');
        cy.findByText('LAB teacher').should('exist');
        cy.findByText('LAB judge').should('exist');
        cy.findByText('label1').should('not.exist');
      });

      // Check tasks in the card footer
      cy.get('.pf-v6-c-card__footer').within(() => {
        cy.findByText('task1').should('exist');
        cy.findByText('task2').should('exist');
      });
    });
  });

  it('should show multiple model sources with correct headers', () => {
    const rhModel = mockRedHatModel({
      name: 'rh-model',
      tasks: ['task1'],
    });

    const thirdPartyModel = mockThirdPartyModel({
      name: 'third-party-model',
      tasks: ['task2'],
    });

    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
      },
      mockModelCatalogConfigMap([
        mockModelCatalogSource({
          source: 'Red Hat',
          displayName: 'Red Hat models',
          models: [rhModel],
        }),
        mockModelCatalogSource({
          source: 'Third-party',
          displayName: 'Third-party models',
          models: [thirdPartyModel],
        }),
      ]),
    );

    modelCatalog.visit();
    modelCatalog.findModelCatalogCards().should('exist');

    cy.findByRole('heading', { level: 2, name: 'Red Hat models' }).should('exist');
    cy.findByRole('heading', { level: 2, name: 'Third-party models' }).should('exist');

    modelCatalog.findModelCatalogCard('rh-model').should('exist');
    modelCatalog.findModelCatalogCard('third-party-model').should('exist');
  });

  it('should show single source without header when only one source exists', () => {
    const singleModel = mockCatalogModel({
      name: 'single-model',
      source: 'Red Hat',
      tasks: ['task1'],
    });

    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
      },
      mockModelCatalogConfigMap([
        mockModelCatalogSource({ source: 'Red Hat', models: [singleModel] }),
      ]),
    );

    modelCatalog.visit();
    cy.findByTestId('model-catalog-cards').should('exist');

    cy.get('h2').should('not.exist');

    cy.contains('single-model').should('exist');
  });
});
