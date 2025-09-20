/* eslint-disable camelcase */

import { mockFeatureStoreService } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreService';
import { mockFeatureStore } from '@odh-dashboard/feature-store/mocks/mockFeatureStore';
import { mockFeatureStoreProject } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreProject';
import { mockFeature, mockFeaturesList } from '@odh-dashboard/feature-store/mocks/mockFeatures';
import { featuresTable } from '#~/__tests__/cypress/cypress/pages/featureStore/features';
import { featureStoreGlobal } from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal';
import { featureDetails } from '#~/__tests__/cypress/cypress/pages/featureStore/featuresDetails';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { ProjectModel, ServiceModel } from '#~/__tests__/cypress/cypress/utils/models';
import { asClusterAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';

const k8sNamespace = 'default';
const fsName = 'demo';
const fsProjectName = 'credit_scoring_local';
const fsProjectName2 = 'test2';

const mockAllFeaturesIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/features/all*`,
    mockFeaturesList({
      features: [
        mockFeature({
          name: 'test-feature',
          featureView: 'test-feature-view',
          project: fsProjectName,
        }),
        mockFeature({
          name: 'user-feature',
          featureView: 'user-feature-view',
          project: fsProjectName2,
        }),
        mockFeature({
          name: 'transaction_amount',
          featureView: 'transaction_features',
          type: 'FLOAT',
          project: fsProjectName2,
          owner: 'data-team@company.com',
          description: 'Amount of the transaction',
          tags: {
            domain: 'transaction',
            pii: 'false',
            cardinality: 'high',
          },
        }),
      ],
    }),
  ).as('getAllFeatures');
};

const mockProjectFeaturesIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/features?project=${fsProjectName}*`,
    mockFeaturesList({
      features: [
        mockFeature(),
        mockFeature({
          name: 'transaction_amount',
          featureView: 'transaction_features',
          type: 'FLOAT',
          owner: 'data-team@company.com',
          description: 'Amount of the transaction',
          tags: {
            domain: 'transaction',
            pii: 'false',
            cardinality: 'high',
          },
        }),
      ],
    }),
  ).as('getProjectFeatures');
};

const mockFeatureDetailsIntercept = () => {
  cy.intercept(
    'GET',
    `**/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/features/test-feature-view/test-feature**`,
    mockFeature({
      name: 'test-feature',
      featureView: 'test-feature-view',
      type: 'STRING',
      project: fsProjectName,
      owner: 'test-owner@example.com',
      description: 'A test feature for unit testing',
      tags: {
        category: 'demographic',
        pii: 'false',
        cardinality: 'high',
        domain: 'user',
      },
      featureDefinition: 'SELECT feature_value FROM table WHERE user_id = ?',
    }),
  ).as('getFeatureDetails');
};

const initIntercept = () => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        feastoperator: true,
      },
    }),
  );

  cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableFeatureStore: false }));

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: k8sNamespace })]),
  );

  cy.intercept(
    'GET',
    `/api/k8s/apis/feast.dev/v1alpha1/namespaces/${k8sNamespace}/featurestores?labelSelector=feature-store-ui%3Denabled`,
    {
      items: [mockFeatureStore({ name: fsName, namespace: k8sNamespace })],
    },
  );

  cy.interceptK8sList(
    ServiceModel,
    mockK8sResourceList([
      mockFeatureStoreService({
        name: 'feast-demo-registry-rest',
        namespace: 'default',
        featureStoreName: fsName,
      }),
    ]),
  );

  cy.interceptOdh(
    'GET /api/service/featurestore/:namespace/:serviceName/api/:apiVersion/projects',
    {
      path: { namespace: k8sNamespace, serviceName: fsName, apiVersion: 'v1' },
    },
    {
      projects: [
        mockFeatureStoreProject({ spec: { name: fsProjectName } }),
        mockFeatureStoreProject({ spec: { name: 'test2' } }),
      ],
      pagination: {
        total_count: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
        page: 1,
        limit: 10,
      },
    },
  );
};

describe('Features for a single project', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercept();
    mockProjectFeaturesIntercept();
  });

  it('should display features page with correct title and content', () => {
    featureStoreGlobal.visitFeatures(fsProjectName);

    featureStoreGlobal.findHeading().should('have.text', 'Features');

    featureStoreGlobal.findProjectSelector().should('exist');
    featureStoreGlobal.findProjectSelector().click();
    featureStoreGlobal.findProjectSelectorDropdown().should('contain.text', fsProjectName);
  });

  it('should display features table with mocked data', () => {
    featureStoreGlobal.visitFeatures(fsProjectName);

    featuresTable.findTable().should('exist');

    featuresTable.shouldHaveFeatureCount(2);

    const mockFeatureName = 'transaction_amount';
    const featureRow = featuresTable.findRow(mockFeatureName);

    featureRow.shouldHaveFeatureName(mockFeatureName);
    featureRow.shouldHaveValueType('FLOAT');
    featureRow.shouldHaveFeatureView('transaction_features');
    featureRow.shouldHaveOwner('data-team@company.com');
  });

  it('should allow filtering by feature name', () => {
    featureStoreGlobal.visitFeatures(fsProjectName);

    const toolbar = featuresTable.findToolbar();
    toolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Feature').click();
    toolbar.findSearchInput().type('zipcodess');
    featuresTable.shouldHaveFeatureCount(0);

    cy.findByTestId('clear-filters-button').should('exist');
    cy.findByTestId('clear-filters-button').click();
    toolbar.findSearchInput().type('test-feature');
    featuresTable.shouldHaveFeatureCount(1);
  });

  it('should allow filtering by feature view', () => {
    featureStoreGlobal.visitFeatures(fsProjectName);

    const toolbar = featuresTable.findToolbar();

    toolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Feature view').click();
    toolbar.findSearchInput().type('zipcode_features');
    featuresTable.shouldHaveFeatureCount(0);
    // When no results, use empty state clear filters button
    featuresTable.findClearFiltersButton().should('exist');
    featuresTable.findClearFiltersButton().click();
    featuresTable.shouldHaveFeatureCount(2);
  });
});

describe('Features for all projects', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercept();
    mockAllFeaturesIntercept();
  });

  it('should display features page with correct title and content', () => {
    featureStoreGlobal.visitFeatures();
    cy.findByTestId('app-page-title').should('have.text', 'Features');
    cy.testA11y();
  });

  it('should display features table with mocked data', () => {
    featureStoreGlobal.visitFeatures();
    featuresTable.findTable().should('exist');
    featuresTable.shouldHaveFeatureCount(3);

    const mockFeatureName = 'transaction_amount';
    const featureRow = featuresTable.findRow(mockFeatureName);

    featureRow.shouldHaveFeatureName(mockFeatureName);
    featureRow.shouldHaveValueType('FLOAT');
    featureRow.shouldHaveFeatureView('transaction_features');
    featureRow.shouldHaveOwner('data-team@company.com');
  });

  it('should allow filtering by feature name', () => {
    featureStoreGlobal.visitFeatures();
    const toolbar = featuresTable.findToolbar();

    toolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Feature').click();
    toolbar.findSearchInput().type('zipcodess');
    featuresTable.shouldHaveFeatureCount(0);

    featuresTable.findClearFiltersButton().should('exist');
    featuresTable.findClearFiltersButton().click();
    toolbar.findSearchInput().type('test-feature');
    featuresTable.shouldHaveFeatureCount(1);
  });

  it('should allow filtering by feature view for all projects', () => {
    featureStoreGlobal.visitFeatures();
    const toolbar = featuresTable.findToolbar();

    toolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Feature view').click();
    toolbar.findSearchInput().type('zipcode_features');
    featuresTable.shouldHaveFeatureCount(0);

    featuresTable.findClearFiltersButton().should('exist');
    featuresTable.findClearFiltersButton().click();
    featuresTable.shouldHaveFeatureCount(3);
  });

  it('should allow filtering by feature store repositories', () => {
    featureStoreGlobal.visitFeatures();
    const toolbar = featuresTable.findToolbar();

    toolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Feature store repository').click();
    toolbar.findSearchInput().type('credit_scoring_local');
    featuresTable.shouldHaveFeatureCount(1);

    featuresTable.findToolbarClearFiltersButton().should('exist');
    featuresTable.findToolbarClearFiltersButton().click();
    featuresTable.shouldHaveFeatureCount(3);
  });

  it('should navigate to feature details when clicking feature name in all projects view', () => {
    mockFeatureDetailsIntercept();
    featureStoreGlobal.visitFeatures();

    featuresTable.findTable().should('be.visible');
    cy.url().then((url) => {
      cy.log('Current URL before clicking:', url);
    });
    featuresTable.findRow('test-feature').findFeatureLink().click();
    cy.url().then((url) => {
      cy.log('URL after clicking:', url);
    });

    cy.url().should(
      'include',
      '/featureStore/features/credit_scoring_local/test-feature-view/test-feature',
    );
    featureDetails
      .shouldHaveApplicationsPageDescription('A test feature for unit testing')
      .shouldHaveFeatureValueType('STRING');
    featureDetails.findFeatureTags().should('be.visible');
    featureDetails.findFeatureInteractiveExample().should('be.visible');
    featureDetails.findBreadcrumbLink().should('be.visible');
    featureDetails.findBreadcrumbItem().should('contain.text', 'test-feature');
  });

  it('should navigate back to features page when clicking breadcrumb link', () => {
    mockFeatureDetailsIntercept();
    featureStoreGlobal.visitFeatures();
    featuresTable.findTable().should('be.visible');
    featuresTable.findRow('test-feature').findFeatureLink().click();
    cy.url().should(
      'include',
      '/featureStore/features/credit_scoring_local/test-feature-view/test-feature',
    );

    featureDetails.findBreadcrumbLink().should('be.visible');
    featureDetails.findBreadcrumbItem().should('contain.text', 'test-feature');
    featureDetails.findBreadcrumbLink().click();

    cy.url().should('include', '/featureStore/features');
    featureStoreGlobal.findHeading().should('have.text', 'Features');
    featuresTable.findTable().should('be.visible');
  });
});

describe('Feature Details', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercept();
    mockProjectFeaturesIntercept();
  });

  it('should navigate to feature details when clicking feature name in single project view', () => {
    mockFeatureDetailsIntercept();
    featureStoreGlobal.visitFeatures(fsProjectName);

    featuresTable.findTable().should('be.visible');
    featuresTable.findRow('test-feature').findFeatureLink().click();
    cy.url().should(
      'include',
      '/featureStore/features/credit_scoring_local/test-feature-view/test-feature',
    );
    featureDetails
      .shouldHaveApplicationsPageDescription('A test feature for unit testing')
      .shouldHaveFeatureValueType('STRING');
    featureDetails.findFeatureTags().should('be.visible');
    featureDetails.findFeatureInteractiveExample().should('be.visible');
    featureDetails.findBreadcrumbLink().should('be.visible');
    featureDetails.findBreadcrumbItem().should('contain.text', 'test-feature');
  });
  //TODO: Add test for feature not found after API is fixed
  // it.only('should handle feature not found with proper error message', () => {
  //   cy.intercept(
  //     'GET',
  //     `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/features/test-feature-view/nonexistent?include_relationships=true&project=${fsProjectName}*`,
  //     {
  //       statusCode: 404,
  //       body: { detail: `Feature nonexistent does not exist in project ${fsProjectName}` },
  //     },
  //   ).as('getFeatureNotFound');

  //   cy.visit(`/featureStore/features/${fsProjectName}/test-feature-view/nonexistent`);
  //   cy.findByText(`Feature nonexistent does not exist in project ${fsProjectName}`).should(
  //     'be.visible',
  //   );
  // });

  it('should display feature details tabs correctly', () => {
    mockFeatureDetailsIntercept();
    featureStoreGlobal.visitFeatures(fsProjectName);
    featuresTable.findRow('test-feature').findFeatureLink().click();
    cy.url().should(
      'include',
      '/featureStore/features/credit_scoring_local/test-feature-view/test-feature',
    );

    featureDetails.findFeatureDetailsPage().should('be.visible');
    featureDetails.findFeatureValueType().should('be.visible');
    featureDetails.shouldHaveTabsExist().shouldHaveTabsVisibleAndClickable().testTabSwitching();
  });
});
