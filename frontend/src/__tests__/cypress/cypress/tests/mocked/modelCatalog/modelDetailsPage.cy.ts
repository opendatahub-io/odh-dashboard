import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockModelRegistryService,
} from '#~/__mocks__';
import {
  mockModelCatalogConfigMap,
  mockUnmanagedModelCatalogConfigMap,
} from '#~/__mocks__/mockModelCatalogConfigMap';
import { modelDetailsPage } from '#~/__tests__/cypress/cypress/pages/modelCatalog/modelDetailsPage';
import { ConfigMapModel, ServiceModel } from '#~/__tests__/cypress/cypress/utils/models';
import type { ServiceKind } from '#~/k8sTypes';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';
import { mockCatalogModel } from '#~/__mocks__/mockCatalogModel';
import { mockModelCatalogSource } from '#~/__mocks__/mockModelCatalogSource';
import type { ModelCatalogSource } from '#~/concepts/modelCatalog/types';

type HandlersProps = {
  modelRegistries?: ServiceKind[];
  catalogModels?: ModelCatalogSource[];
  disableFineTuning?: boolean;
};

const initIntercepts = ({
  modelRegistries = [
    mockModelRegistryService({ name: 'modelregistry-sample' }),
    mockModelRegistryService({
      name: 'modelregistry-sample-2',
      serverUrl: 'modelregistry-sample-2-rest.com:443',
      description: '',
    }),
  ],
  catalogModels = [mockModelCatalogSource({})],
  disableFineTuning = false,
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
      disableModelCatalog: false,
      disableFineTuning,
    }),
  );

  cy.interceptK8s(
    {
      model: ConfigMapModel,
      ns: 'opendatahub',
      name: 'model-catalog-sources',
    },
    mockModelCatalogConfigMap(catalogModels),
  );

  cy.interceptK8s(
    {
      model: ConfigMapModel,
      ns: 'opendatahub',
      name: 'model-catalog-unmanaged-sources',
    },
    mockUnmanagedModelCatalogConfigMap([]),
  );

  cy.interceptK8sList(ServiceModel, mockK8sResourceList(modelRegistries));
};

describe('Model details page', () => {
  it('Model details page', () => {
    initIntercepts({});
    modelDetailsPage.visit();
    modelDetailsPage
      .findLongDescription()
      .should(
        'have.text',
        'Granite-8B-Code-Instruct is a 8B parameter model fine tuned from\nGranite-8B-Code-Base on a combination of permissively licensed instruction\ndata to enhance instruction following capabilities including logical\nreasoning and problem-solving skills.',
      );
    cy.reload();
    verifyRelativeURL('/modelCatalog/Red%20Hat/rhelai1/granite-8b-code-instruct/1%252E3%252E0');
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
    initIntercepts({});
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

  it('Check for Register model button to be disabled with a popover, when no model registry present', () => {
    initIntercepts({ modelRegistries: [] });
    modelDetailsPage.visit();
    modelDetailsPage.findRegisterModelButton().trigger('mouseenter');
    modelDetailsPage.findRegisterCatalogModelPopover().should('be.visible');
    modelDetailsPage
      .findRegisterCatalogModelPopover()
      .findByText(
        'To request a new model registry, or to request permission to access an existing model registry, contact your administrator.',
      );
  });

  it('Should redirect to register catalog model page, when register model button is enabled', () => {
    initIntercepts({});
    modelDetailsPage.visit();
    modelDetailsPage.findRegisterModelButton().should('be.enabled');
    modelDetailsPage.findRegisterModelButton().click();
    verifyRelativeURL(
      '/modelCatalog/Red%20Hat/rhelai1/granite-8b-code-instruct/1%252E3%252E0/register',
    );
  });
});

it('Should show tune action item with popover when fineTuning is enabled and lab-base label exists', () => {
  initIntercepts({
    catalogModels: [
      mockModelCatalogSource({
        models: [
          mockCatalogModel({
            labels: ['lab-base', 'foo', 'bar', 'label1'],
          }),
        ],
      }),
    ],
  });
  modelDetailsPage.visit();
  modelDetailsPage.findTuneModelButton().click();
  modelDetailsPage.findTuneModelPopover().should('be.visible');
});

it('Should not show tune action item with popover when fineTuning is disabled', () => {
  initIntercepts({
    disableFineTuning: true,
    catalogModels: [
      mockModelCatalogSource({
        models: [
          mockCatalogModel({
            labels: ['lab-base', 'foo', 'bar', 'label1'],
          }),
        ],
      }),
    ],
  });
  modelDetailsPage.visit();
  modelDetailsPage.findTuneModelButton().should('not.exist');
});

it('Should not show tune action item when there is no lab-base', () => {
  initIntercepts({
    catalogModels: [
      mockModelCatalogSource({
        models: [
          mockCatalogModel({
            labels: ['foo', 'bar', 'label1'],
          }),
        ],
      }),
    ],
  });
  modelDetailsPage.visit();
  modelDetailsPage.findTuneModelButton().should('not.exist');
});

it('Should correctly show labels, including reserved ILab labels, correctly and in the correct order', () => {
  initIntercepts({
    disableFineTuning: true,
    catalogModels: [
      mockModelCatalogSource({
        models: [
          mockCatalogModel({
            labels: ['lab-base', 'lab-teacher', 'lab-judge', 'label1'],
            tasks: ['task1', 'task2'],
          }),
        ],
      }),
    ],
  });
  modelDetailsPage.visit();
  modelDetailsPage.expandLabelGroup();

  modelDetailsPage.findLabelByIndex(0).contains('LAB starter').should('exist');
  modelDetailsPage.findLabelByIndex(1).contains('LAB teacher').should('exist');
  modelDetailsPage.findLabelByIndex(2).contains('LAB judge').should('exist');
  modelDetailsPage.findLabelByIndex(3).contains('task1').should('exist');
  modelDetailsPage.findLabelByIndex(4).contains('task2').should('exist');
  modelDetailsPage.findLabelByIndex(5).contains('label1').should('exist');
});

describe('Model Details loading states', () => {
  beforeEach(() => {
    initIntercepts({});
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
    modelDetailsPage.visit();
    modelDetailsPage.findModelCatalogEmptyState().should('exist');
  });

  it('should show empty state when configmap has empty sources', () => {
    // Mock managed ConfigMap with empty data
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
        data: { modelCatalogSources: JSON.stringify({ sources: [] }) },
      },
    );

    modelDetailsPage.visit();
    cy.contains('Details not found').should('exist');
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

    modelDetailsPage.visit();
    cy.contains('Unable to load model catalog').should('exist');
  });

  it('should show error state when configmap has malformed data', () => {
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

    modelDetailsPage.visit();
    cy.contains('Unable to load model catalog').should('exist');
  });

  it('should show model details when configmap has valid data', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
      },
      mockModelCatalogConfigMap(),
    );

    modelDetailsPage.visit();
    modelDetailsPage.findLongDescription().should('exist');
  });
});
