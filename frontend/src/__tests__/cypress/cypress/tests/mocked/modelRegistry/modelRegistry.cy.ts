/* eslint-disable camelcase */
import { mockDscStatus, mockK8sResourceList } from '#~/__mocks__';
import { mockComponents } from '#~/__mocks__/mockComponents';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockRegisteredModelList } from '#~/__mocks__/mockRegisteredModelsList';
import { labelModal, modelRegistry } from '#~/__tests__/cypress/cypress/pages/modelRegistry';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import {
  SelfSubjectAccessReviewModel,
  SelfSubjectRulesReviewModel,
  ServiceModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { mockModelVersionList } from '#~/__mocks__/mockModelVersionList';
import { mockModelVersion } from '#~/__mocks__/mockModelVersion';
import { mockRegisteredModel } from '#~/__mocks__/mockRegisteredModel';
import { mockModelRegistryService } from '#~/__mocks__/mockModelRegistryService';
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
import type { ServiceKind } from '#~/k8sTypes';

const MODEL_REGISTRY_API_VERSION = 'v1alpha3';

type HandlersProps = {
  disableModelRegistryFeature?: boolean;
  modelRegistries?: ServiceKind[];
  registeredModels?: RegisteredModel[];
  modelVersions?: ModelVersion[];
  allowed?: boolean;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const createInterceptConfig = (initial?: HandlersProps) =>
  ({
    ...initial,
  } satisfies HandlersProps);

// Each test keeps its own reference
let interceptConfig: HandlersProps = createInterceptConfig();

const setInterceptConfig = (config: HandlersProps) => {
  interceptConfig = {
    disableModelRegistryFeature: false,
    modelRegistries: [
      mockModelRegistryService({ name: 'modelregistry-sample' }),
      mockModelRegistryService({
        name: 'modelregistry-sample-2',
        serverUrl: 'modelregistry-sample-2-rest.com:443',
        description: '',
      }),
    ],
    registeredModels: [
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
    modelVersions: [
      mockModelVersion({ author: 'Author 1' }),
      mockModelVersion({ name: 'model version' }),
    ],
    allowed: true,
    ...config,
  };
};

// Register all intercepts once to prevent stacking
const registerIntercepts = () => {
  cy.interceptOdh('GET /api/dsc/status', (req) => {
    req.reply(
      mockDscStatus({
        installedComponents: {
          'model-registry-operator': !interceptConfig.disableModelRegistryFeature,
        },
      }),
    );
  }).as('dscStatus');

  cy.interceptOdh('GET /api/config', (req) => {
    req.reply(
      mockDashboardConfig({
        disableModelRegistry: interceptConfig.disableModelRegistryFeature,
      }),
    );
  }).as('config');

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
      },
    },
    (req) => {
      req.reply(mockModelVersionList({ items: interceptConfig.modelVersions || [] }));
    },
  ).as('modelVersions');

  cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents()).as(
    'components',
  );

  cy.interceptK8s('POST', SelfSubjectRulesReviewModel, mockSelfSubjectRulesReview()).as(
    'selfSubjectRulesReview',
  );

  cy.interceptK8sList(ServiceModel, (req) => {
    req.reply(mockK8sResourceList(interceptConfig.modelRegistries || []));
  }).as('servicesList');

  cy.interceptK8s(ServiceModel, mockModelRegistryService({ name: 'modelregistry-sample' })).as(
    'sampleService',
  );

  cy.interceptK8s(ServiceModel, mockModelRegistryService({ name: 'dallas-mr' })).as(
    'dallasService',
  );

  // Handle multiple SelfSubjectAccessReview requests based on request body
  cy.interceptK8s('POST', SelfSubjectAccessReviewModel, (req) => {
    const { resourceAttributes } = req.body.spec;

    // Mock for services list permission - always allow for non-admin users to see empty state
    if (resourceAttributes.resource === 'services' && resourceAttributes.verb === 'list') {
      req.reply(
        mockSelfSubjectAccessReview({
          verb: 'list',
          resource: 'services',
          group: '',
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
          allowed: interceptConfig.allowed ?? true, // This parameter controls admin access
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
  }).as('selfSubjectAccessReview');

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models`,
    {
      path: { serviceName: 'modelregistry-sample', apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    (req) => {
      req.reply(mockRegisteredModelList({ items: interceptConfig.registeredModels || [] }));
    },
  ).as('registeredModels');

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    (req) => {
      req.reply(mockModelVersionList({ items: interceptConfig.modelVersions || [] }));
    },
  ).as('registeredModelVersions');
};

// Simplified function to just configure test data
const initIntercepts = (config: HandlersProps) => {
  setInterceptConfig(config);
};

// Register intercepts once for the entire spec file
before(() => {
  registerIntercepts();
});

describe('Model Registry core', () => {
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

    cy.findByRole('button', { name: 'Models' }).should('exist').click();
    cy.findByRole('link', { name: 'Model registry' }).should('exist');
  });

  it('Renders empty state with no model registries', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
      modelRegistries: [],
    });

    modelRegistry.visit();
    cy.findByRole('button', { name: 'Models' }).should('exist').click();
    modelRegistry.findModelRegistryEmptyState().should('exist');
  });

  it('Shows admin empty state for users with model registry creation permissions', () => {
    asProductAdminUser();
    initIntercepts({
      disableModelRegistryFeature: false,
      modelRegistries: [],
      allowed: true,
    });

    modelRegistry.visit();
    cy.findByRole('button', { name: 'Models' }).should('exist').click();

    // Check for admin-specific content
    modelRegistry.findModelRegistryEmptyState().should('exist');
    cy.findByTestId('empty-model-registries-state').within(() => {
      cy.findByText('Create a model registry').should('exist');
      cy.contains('No model registries are available to users in your organization').should(
        'exist',
      );
      cy.contains('Create a model registry from the').should('exist');
      cy.contains('Model registry settings').should('exist');
      cy.findByRole('link', { name: 'Go to Model registry settings' })
        .should('exist')
        .and('have.attr', 'href', '/modelRegistrySettings');
    });
  });

  it('Shows non-admin empty state for users without model registry creation permissions', () => {
    asProjectEditUser();
    initIntercepts({
      disableModelRegistryFeature: false,
      modelRegistries: [],
      allowed: false,
    });

    modelRegistry.visit();
    cy.findByRole('button', { name: 'Models' }).should('exist').click();

    // Check for non-admin specific content
    modelRegistry.findModelRegistryEmptyState().should('exist');
    cy.findByTestId('empty-model-registries-state').within(() => {
      cy.findByText('Request access to model registries').should('exist');
      cy.findByText(
        'To request a new model registry, or to request permission to access an existing model registry, contact your administrator.',
      ).should('exist');
      // Should not show link to model registry settings
      cy.findByRole('link', { name: 'Go to Model registry settings' }).should('not.exist');
    });
  });

  it('No registered models in the selected Model Registry', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
      registeredModels: [],
    });

    modelRegistry.visit();
    cy.findByRole('button', { name: 'Models' }).should('exist').click();
    modelRegistry.shouldModelRegistrySelectorExist();
    modelRegistry.shouldregisteredModelsEmpty();

    modelRegistry.findViewDetailsButton().click();
    modelRegistry.findDetailsPopover().should('exist');
    modelRegistry.findDetailsPopover().findByText('Model registry description').should('exist');
    modelRegistry
      .findDetailsPopover()
      .findByText('https://modelregistry-sample-rest.com:443')
      .should('exist');

    // Model registry with no description
    modelRegistry.findModelRegistry().findSelectOption('modelregistry-sample-2').click();
    modelRegistry.findViewDetailsButton().click();
    modelRegistry.findDetailsPopover().should('exist');
    modelRegistry.findDetailsPopover().findByText('No description').should('exist');
    modelRegistry
      .findDetailsPopover()
      .findByText('https://modelregistry-sample-2-rest.com:443')
      .should('exist');

    //  Model registry help content
    modelRegistry.findHelpContentButton().click();
    modelRegistry.findHelpContentPopover().should('exist');
    modelRegistry
      .findHelpContentPopover()
      .findByText(
        'To request access to a new or existing model registry, contact your administrator.',
      )
      .should('exist');
  });

  describe('Registered model table', () => {
    beforeEach(() => {
      initIntercepts({ disableModelRegistryFeature: false });
      modelRegistry.visit();
    });

    it('Renders row contents', () => {
      const registeredModelRow = modelRegistry.getRow('Fraud detection model');
      registeredModelRow.findName().contains('Fraud detection model');
      registeredModelRow
        .findDescription()
        .contains(
          'A machine learning model trained to detect fraudulent transactions in financial data',
        );
      registeredModelRow.findOwner().contains('Author 1');

      // Label popover
      registeredModelRow.findLabelPopoverText().contains('2 more');
      registeredModelRow.findLabelPopoverText().click();
      registeredModelRow.shouldContainsPopoverLabels([
        'Machine learning',
        'Next data to be overflow',
      ]);
    });

    it('Renders labels in modal', () => {
      const registeredModelRow2 = modelRegistry.getRow('Label modal');
      registeredModelRow2.findLabelModalText().contains('6 more');
      registeredModelRow2.findLabelModalText().click();
      labelModal.shouldContainsModalLabels([
        'Testing label',
        'Financial',
        'Financial data',
        'Fraud detection',
        'Machine learning',
        'Next data to be overflow',
        'Label x',
        'Label y',
        'Label z',
      ]);
      labelModal.findModalSearchInput().type('Financial');
      labelModal.shouldContainsModalLabels(['Financial', 'Financial data']);
      labelModal.findCloseModal().click();
    });

    it('Sort by Model name', () => {
      modelRegistry.findRegisteredModelTableHeaderButton('Model name').click();
      modelRegistry.findRegisteredModelTableHeaderButton('Model name').should(be.sortAscending);
      modelRegistry.findRegisteredModelTableHeaderButton('Model name').click();
      modelRegistry.findRegisteredModelTableHeaderButton('Model name').should(be.sortDescending);
    });

    it('Sort by Last modified', () => {
      modelRegistry.findRegisteredModelTableHeaderButton('Last modified').should(be.sortAscending);
      modelRegistry.findRegisteredModelTableHeaderButton('Last modified').click();
      modelRegistry.findRegisteredModelTableHeaderButton('Last modified').should(be.sortDescending);
    });

    it('Filter by keyword', () => {
      modelRegistry.findTableSearch().type('Fraud detection model');
      modelRegistry.findTableRows().should('have.length', 1);
      modelRegistry.findTableRows().contains('Fraud detection model');
    });
  });
});

describe('Register Model button', () => {
  it('Navigates to register page from empty state', () => {
    initIntercepts({ disableModelRegistryFeature: false, registeredModels: [] });
    modelRegistry.visit();
    modelRegistry.findRegisterModelButton().click();
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('Register model');
    cy.findByText('Model registry - modelregistry-sample').should('exist');
  });

  it('Navigates to register page from table toolbar', () => {
    initIntercepts({ disableModelRegistryFeature: false });
    modelRegistry.visit();
    modelRegistry.findRegisterModelButton().click();
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('Register model');
    cy.findByText('Model registry - modelregistry-sample').should('exist');
  });

  it('should be accessible for non-admin users', () => {
    asProjectEditUser();
    initIntercepts({
      disableModelRegistryFeature: false,
      allowed: false,
    });

    modelRegistry.visit();
    cy.findByRole('button', { name: 'Models' }).should('exist').click();
    modelRegistry.shouldModelRegistrySelectorExist();
  });
});
