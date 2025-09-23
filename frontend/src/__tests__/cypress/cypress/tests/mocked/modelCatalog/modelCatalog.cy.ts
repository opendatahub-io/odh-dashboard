/* eslint-disable camelcase */
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { mockDscStatus } from '#~/__mocks__';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { modelCatalog } from '#~/__tests__/cypress/cypress/pages/modelCatalog/modelCatalog';
import { ConfigMapModel, ServiceModel } from '#~/__tests__/cypress/cypress/utils/models';
import { mockModelCatalogSource } from '#~/__mocks__/mockModelCatalogSource';
import {
  mockRedHatModel,
  mockThirdPartyModel,
  mockCatalogModel,
} from '#~/__mocks__/mockCatalogModel';
import {
  mockManagedModelCatalogConfigMap,
  mockUnmanagedModelCatalogConfigMap,
  mockConfigMap404Response,
  mockModelCatalogConfigMap,
} from '#~/__mocks__/mockModelCatalogConfigMap';
import { mockModelRegistryService } from '#~/__mocks__/mockModelRegistryService';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import type { ModelCatalogSource } from '#~/concepts/modelCatalog/types';
import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';

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

// TODO: Fix these tests
describe.skip('Model Catalog core', () => {
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
    modelCatalog.findModelCatalogModelDetailLink('granite-8b-code-instruct').click();
    cy.location('pathname').should(
      'equal',
      '/ai-hub/catalog/Red%20Hat/rhelai1/granite-8b-code-instruct/1%252E3%252E0',
    );
  });
});

// TODO: Fix these tests
describe.skip('Model Catalog loading states', () => {
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

  it('should show empty state when configmap has empty sources', () => {
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

// TODO: Fix these tests
describe.skip('Model catalog cards', () => {
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
    modelCatalog.findModelCatalogCards().should('exist');
    // Find the specific model card
    modelCatalog.expandCardLabelGroup('test-model-1'); // Check ILAB labels in the label group
    modelCatalog.findCardLabelByIndex('test-model-1', 0).contains('LAB starter').should('exist');
    modelCatalog.findCardLabelByIndex('test-model-1', 1).contains('LAB teacher').should('exist');
    modelCatalog.findCardLabelByIndex('test-model-1', 2).contains('LAB judge').should('exist');
    modelCatalog.findCardLabelByIndex('test-model-1', 3).contains('task1').should('exist');
    modelCatalog.findCardLabelByIndex('test-model-1', 4).contains('task2').should('exist');
    modelCatalog.findCardLabelByText('test-model-1', 'label1').should('not.exist');

    // Check tasks in the card footer
    cy.get('.pf-v6-c-card__footer').within(() => {
      cy.findByText('task1').should('exist');
      cy.findByText('task2').should('exist');
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
          models: [rhModel],
        }),
        mockModelCatalogSource({
          source: 'Third-party',
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
});

// TODO: Fix these tests
describe.skip('Model catalog sources from multiple configmaps', () => {
  it('should show models from both managed and unmanaged configmaps', () => {
    const rhModel = mockRedHatModel({
      name: 'rh-model',
      tasks: ['task1'],
    });

    const thirdPartyModel = mockThirdPartyModel({
      name: 'third-party-model',
      tasks: ['task2'],
    });

    initIntercepts({
      managedSources: [
        mockModelCatalogSource({
          source: 'Red Hat',
          models: [rhModel],
        }),
      ],
      unmanagedSources: [
        mockModelCatalogSource({
          source: 'Third-party',
          models: [thirdPartyModel],
        }),
      ],
    });

    modelCatalog.visit();

    cy.findByRole('heading', { level: 2, name: 'Red Hat models' }).should('exist');
    cy.findByRole('heading', { level: 2, name: 'Third-party models' }).should('exist');

    modelCatalog.findModelCatalogCard('rh-model').should('exist');
    modelCatalog.findModelCatalogCard('third-party-model').should('exist');
  });

  it('should show only Red Hat models when unmanaged configmap returns 404', () => {
    const rhModel = mockRedHatModel({
      name: 'rh-model',
      tasks: ['task1'],
    });

    initIntercepts({
      managedSources: [
        mockModelCatalogSource({
          source: 'Red Hat',
          models: [rhModel],
        }),
      ],
      hasUnmanagedSourcesConfigMap: false,
    });

    modelCatalog.visit();
    modelCatalog.findModelCatalogCards().should('exist');

    cy.findByRole('heading', { level: 2, name: 'Red Hat models' }).should('exist');
    cy.findByRole('heading', { level: 2, name: 'Third-party models' }).should('not.exist');

    modelCatalog.findModelCatalogCard('rh-model').should('exist');

    cy.contains('Unable to load model catalog').should('not.exist');
    modelCatalog.findModelCatalogEmptyState().should('not.exist');
  });
});

// TODO: Fix these tests
describe.skip('redirect from v2 to v3 route', () => {
  const modelPath = 'Red%20Hat/rhelai1/granite-8b-code-instruct/1%252E3%252E0';
  beforeEach(() => {
    initIntercepts({ disableModelCatalogFeature: false });
  });

  it('root', () => {
    cy.visitWithLogin('/model-catalog');
    cy.findByTestId('app-page-title').contains('Catalog');
    cy.url().should('include', '/ai-hub/catalog');
  });

  it('details', () => {
    cy.visitWithLogin(`/model-catalog/${modelPath}`);
    cy.findByTestId('app-page-title').contains('granite-8b-code-instruct');
    cy.url().should('include', `/ai-hub/catalog/${modelPath}`);
  });

  it('register', () => {
    cy.visitWithLogin(`/model-catalog/${modelPath}/register`);
    cy.findByTestId('app-page-title').contains('Register granite-8b-code-instruct');
    cy.url().should('include', `/ai-hub/catalog/${modelPath}/register`);
  });
});
