/* eslint-disable camelcase */
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { mockComponents } from '@odh-dashboard/internal/__mocks__/mockComponents';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockRegisteredModelList } from '@odh-dashboard/internal/__mocks__/mockRegisteredModelsList';
import { mockModelVersionList } from '@odh-dashboard/internal/__mocks__/mockModelVersionList';
import { mockModelVersion } from '@odh-dashboard/internal/__mocks__/mockModelVersion';
import { mockRegisteredModel } from '@odh-dashboard/internal/__mocks__/mockRegisteredModel';
import { mockModelRegistry } from '@odh-dashboard/internal/__mocks__/mockModelRegistryService';
import { mockSelfSubjectRulesReview } from '@odh-dashboard/internal/__mocks__/mockSelfSubjectRulesReview';
import { mockSelfSubjectAccessReview } from '@odh-dashboard/internal/__mocks__/mockSelfSubjectAccessReview';
import {
  ModelRegistryMetadataType,
  type ModelVersion,
  type RegisteredModel,
} from '@odh-dashboard/internal/concepts/modelRegistry/types';
import type { ModelRegistry } from '@odh-dashboard/internal/k8sTypes';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { appChrome } from '../../../pages/appChrome';
import { SelfSubjectAccessReviewModel, SelfSubjectRulesReviewModel } from '../../../utils/models';
import { modelRegistry } from '../../../pages/modelRegistry';

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
      components: {
        [DataScienceStackComponent.MODEL_REGISTRY]: { managementState: 'Managed' },
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
    `GET /model-registry/api/:apiVersion/user`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
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

  it('Shows admin empty state for users with model registry creation permissions', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
      modelRegistries: [],
      registeredModels: [],
      allowed: true,
    });

    modelRegistry.visit();
    appChrome.findNavSection('AI hub').should('exist');

    // Wait for the access check to complete and verify admin-specific content
    modelRegistry.findEmptyStateAdminTitle().should('exist');
    modelRegistry.findModelRegistryEmptyState().should('exist');
    modelRegistry.findModelRegistryEmptyState().within(() => {
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
    initIntercepts({
      disableModelRegistryFeature: false,
      modelRegistries: [],
      registeredModels: [],
      allowed: false,
    });

    modelRegistry.visit();
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

  it('Should be accessible for non-admin users', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
      allowed: false,
    });

    modelRegistry.visit();
    appChrome.findNavSection('AI hub').should('exist');
    modelRegistry.shouldModelRegistrySelectorExist();
  });
});
