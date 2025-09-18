/* eslint-disable camelcase */
import { mockDscStatus } from '#~/__mocks__';
import { mockComponents } from '#~/__mocks__/mockComponents';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockRegisteredModelList } from '#~/__mocks__/mockRegisteredModelsList';
import { modelRegistry } from '#~/__tests__/cypress/cypress/pages/modelRegistry';
import {
  SelfSubjectAccessReviewModel,
  SelfSubjectRulesReviewModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { mockModelVersionList } from '#~/__mocks__/mockModelVersionList';
import { mockModelVersion } from '#~/__mocks__/mockModelVersion';
import { mockRegisteredModel } from '#~/__mocks__/mockRegisteredModel';
import { mockModelRegistry } from '#~/__mocks__/mockModelRegistryService';
import {
  asProjectEditUser,
  asProductAdminUser,
} from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { mockSelfSubjectRulesReview } from '#~/__mocks__/mockSelfSubjectRulesReview';
import { mockSelfSubjectAccessReview } from '#~/__mocks__/mockSelfSubjectAccessReview';
import {
  ModelRegistryMetadataType,
  type ModelVersion,
  type RegisteredModel,
} from '#~/concepts/modelRegistry/types';
import type { ModelRegistry } from '#~/k8sTypes';
import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';

const MODEL_REGISTRY_API_VERSION = 'v1';

type HandlersProps = {
  disableModelRegistryFeature?: boolean;
  modelRegistries?: ModelRegistry[];
  registeredModels?: RegisteredModel[];
  modelVersions?: ModelVersion[];
  allowed?: boolean;
};

const initIntercepts = ({
  disableModelRegistryFeature = false,
  modelRegistries = [
    mockModelRegistry({ name: 'modelregistry-sample' }),
    mockModelRegistry({
      name: 'modelregistry-sample-2',
      description: '',
    }),
  ],
  registeredModels = [
    mockRegisteredModel({
      name: 'Fraud detection model',
      description:
        'A machine learning model trained to detect fraudulent transactions in financial data',
      customProperties: {
        'Financial data': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Fraud detection': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Test label': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Machine learning': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Next data to be overflow': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
      },
    }),
    mockRegisteredModel({
      name: 'Label modal',
      owner: 'Author 2',
      description:
        'A machine learning model trained to detect fraudulent transactions in financial data',
      customProperties: {
        'Testing label': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Financial data': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Fraud detection': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Long label data to be truncated abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc':
          {
            metadataType: ModelRegistryMetadataType.STRING,
            string_value: '',
          },
        'Machine learning': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Next data to be overflow': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Label x': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Label y': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Label z': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
      },
    }),
  ],
  modelVersions = [
    mockModelVersion({ author: 'Author 1' }),
    mockModelVersion({ name: 'model version' }),
  ],
  allowed = true,
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
      disableModelRegistry: disableModelRegistryFeature,
    }),
  );
  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
      },
    },
    mockModelVersionList({ items: modelVersions }),
  );
  cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());

  cy.interceptK8s('POST', SelfSubjectRulesReviewModel, mockSelfSubjectRulesReview());

  // Handle multiple SelfSubjectAccessReview requests based on request body
  cy.interceptK8s('POST', SelfSubjectAccessReviewModel, (req) => {
    const { resourceAttributes } = req.body.spec;

    // Mock for services list permission - always allow for non-admin users to see empty state
    if (resourceAttributes.resource === 'services' && resourceAttributes.verb === 'list') {
      req.reply(
        mockSelfSubjectAccessReview({
          verb: 'list',
          resource: 'services',
          group: 'user.openshift.io',
          allowed: true, // Always allow listing services to see empty state
        }),
      );
    }
    // Mock for model registry creation permission - this controls admin vs non-admin behavior
    else if (
      resourceAttributes.resource === 'modelregistries' &&
      resourceAttributes.verb === 'create'
    ) {
      req.reply(
        mockSelfSubjectAccessReview({
          verb: 'create',
          resource: 'modelregistries',
          group: 'modelregistry.opendatahub.io',
          allowed, // This parameter controls admin access
        }),
      );
    }
    // Default fallback
    else {
      req.reply(
        mockSelfSubjectAccessReview({
          ...resourceAttributes,
          allowed: false,
        }),
      );
    }
  });

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/namespaces`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: [{ metadata: { name: 'odh-model-registries' } }] },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/user`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: modelRegistries },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions`,
    {
      path: { modelRegistryName: 'modelregistry-sample', apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: mockModelVersionList({ items: modelVersions }) },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models`,
    {
      path: { modelRegistryName: 'modelregistry-sample', apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: mockRegisteredModelList({ items: registeredModels }) },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId/versions`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    { data: mockModelVersionList({ items: modelVersions }) },
  );
};

describe('Model Registry core', () => {
  beforeEach(() => {
    // Clear any existing intercepts before each test to prevent conflicts
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('Model Registry Disabled in the cluster', () => {
    initIntercepts({
      disableModelRegistryFeature: true,
    });

    modelRegistry.landingPage();
  });

  it('Model Registry Enabled in the cluster', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
    });

    modelRegistry.landingPage();

    appChrome.findNavItem({ name: 'Registry', rootSection: 'AI hub' }).should('exist');
  });

  // does not work because of ModelRegistryCoreLoader line 66. TODO: Fix this test and investigate this line.
  it.skip('Shows admin empty state for users with model registry creation permissions', () => {
    asProductAdminUser();
    initIntercepts({
      disableModelRegistryFeature: false,
      modelRegistries: [],
      registeredModels: [],
      allowed: true,
    });

    // TODO: Fix this function
    // modelRegistry.visit();
    cy.interceptOdh(
      `GET /model-registry/api/:apiVersion/user`,
      {
        path: { apiVersion: MODEL_REGISTRY_API_VERSION },
      },
      { data: { userId: 'user@example.com', clusterAdmin: true } },
    );
    cy.visitWithLogin('/model-registry/modelregistry-sample');

    appChrome.findNavSection('AI hub').should('exist');

    // Check for admin-specific content
    modelRegistry.findModelRegistryEmptyState().should('exist');
    modelRegistry.findModelRegistryEmptyState().within(() => {
      modelRegistry.findEmptyStateAdminTitle().should('exist');
      modelRegistry.findEmptyStateAdminDescription().should('exist');
      modelRegistry.findEmptyStateAdminInstructions().should('exist');
      modelRegistry.findEmptyStateAdminSettingsLink().should('exist');
      modelRegistry
        .findEmptyStateAdminButton()
        .should('exist')
        .and('have.attr', 'href', '/settings/model-resources-operations/model-registry');
    });
  });

  it('Shows non-admin empty state for users without model registry creation permissions', () => {
    asProjectEditUser();
    initIntercepts({
      disableModelRegistryFeature: false,
      modelRegistries: [],
      registeredModels: [],
      allowed: false,
    });

    // TODO: Fix this function
    // modelRegistry.visit();
    cy.interceptOdh(
      `GET /model-registry/api/:apiVersion/user`,
      {
        path: { apiVersion: MODEL_REGISTRY_API_VERSION },
      },
      { data: { userId: 'user@example.com', clusterAdmin: true } },
    );
    cy.visitWithLogin('/model-registry/modelregistry-sample');
    appChrome.findNavSection('AI hub').should('exist');

    // Check for non-admin specific content
    modelRegistry.findModelRegistryEmptyState().should('exist');
    modelRegistry.findModelRegistryEmptyState().within(() => {
      modelRegistry.findEmptyStateNonAdminTitle().should('exist');
      modelRegistry.findEmptyStateNonAdminDescription().should('exist');
      // Should not show link to model registry settings
      modelRegistry.findEmptyStateAdminButton().should('not.exist');
      // Should show help button for non-admin users
      modelRegistry.findEmptyStateNonAdminHelpButton().should('exist');
    });
  });
});

// This test is skipped because we do not check for more than cluster admin access levels.
describe.skip('Register Model button', () => {
  it('should be accessible for non-admin users', () => {
    asProjectEditUser();
    initIntercepts({
      disableModelRegistryFeature: false,
      allowed: false,
    });

    // TODO: Fix this function
    // modelRegistry.visit();
    cy.visitWithLogin('/model-registry/modelregistry-sample');
    appChrome.findNavSection('AI hub').should('exist');
    modelRegistry.shouldModelRegistrySelectorExist();
  });
});
