/* eslint-disable camelcase */

import { mockFeatureStoreService } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreService';
import { mockFeatureStore } from '@odh-dashboard/feature-store/mocks/mockFeatureStore';
import { mockFeatureStoreProject } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreProject';
import { mockFeatureView } from '@odh-dashboard/feature-store/mocks/mockFeatureViews';
import {
  mockPopularTags,
  mockRecentlyVisited,
  mockResourceCounts,
} from '@odh-dashboard/feature-store/mocks/mockMetrics';
import { featureStoreGlobal } from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { ProjectModel, ServiceModel } from '#~/__tests__/cypress/cypress/utils/models';
import { asClusterAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { featureMetricsOverview } from '#~/__tests__/cypress/cypress/pages/featureStore/featureMetrics';

const k8sNamespace = 'default';
const fsName = 'demo';
const fsProjectName = 'rbac';

const initCommonIntercepts = () => {
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
    '/api/k8s/apis/feast.dev/v1alpha1/featurestores?labelSelector=feature-store-ui%3Denabled',
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
        mockFeatureStoreProject({ spec: { name: 'new-project' } }),
      ],
      pagination: {
        total_count: 2,
        total_pages: 1,
        has_next: false,
        has_previous: false,
        page: 1,
        limit: 10,
      },
    },
  );
};

const mockPopularTagsIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/metrics/popular_tags?project=${fsProjectName}&limit=4*`,
    mockPopularTags(),
  ).as('getPopularTags');
};

const mockRecentlyVisitedIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/metrics/recently_visited?project=${fsProjectName}*`,
    mockRecentlyVisited(),
  ).as('getRecentlyVisited');
};

const mockResourceCountsIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/metrics/resource_counts?project=${fsProjectName}*`,
    mockResourceCounts(),
  ).as('getResourceCounts');
};

const mockFeatureViewsIntercept = () => {
  cy.interceptOdh(
    'GET /api/service/featurestore/:namespace/:serviceName/api/:apiVersion/feature_views',
    {
      path: { namespace: k8sNamespace, serviceName: fsName, apiVersion: 'v1' },
    },
    {
      featureViews: [
        mockFeatureView({
          spec: {
            ...mockFeatureView().spec,
            name: 'driver_hourly_stats',
            entities: ['driver'],
          },
        }),
        mockFeatureView({
          spec: {
            ...mockFeatureView().spec,
            name: 'driver_hourly_stats_fresh',
            entities: ['driver'],
          },
        }),
        mockFeatureView({
          spec: {
            ...mockFeatureView().spec,
            name: 'transformed_conv_rate',
            entities: ['user_id'],
          },
        }),
      ],
      relationships: {},
      pagination: {
        totalCount: 3,
        totalPages: 1,
      },
    },
  ).as('getFeatureViews');
};

const mockFeatureViewDetailsIntercept = () => {
  cy.intercept(
    'GET',
    `**/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/feature_views/driver_hourly_stats?project=${fsProjectName}&include_relationships=true*`,
    mockFeatureView({
      spec: {
        ...mockFeatureView().spec,
        name: 'driver_hourly_stats',
        entities: ['driver'],
      },
    }),
  ).as('getFeatureViewDetails_driver_hourly_stats');

  cy.intercept(
    'GET',
    `**/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/feature_views/driver_hourly_stats_fresh?project=${fsProjectName}&include_relationships=true*`,
    mockFeatureView({
      spec: {
        ...mockFeatureView().spec,
        name: 'driver_hourly_stats_fresh',
        entities: ['driver'],
      },
    }),
  ).as('getFeatureViewDetails_driver_hourly_stats_fresh');

  cy.intercept(
    'GET',
    `**/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/feature_views/transformed_conv_rate?project=${fsProjectName}&include_relationships=true*`,
    mockFeatureView({
      spec: {
        ...mockFeatureView().spec,
        name: 'transformed_conv_rate',
        entities: ['user_id'],
      },
    }),
  ).as('getFeatureViewDetails_transformed_conv_rate');
};

const mockAllMetricsIntercepts = () => {
  mockPopularTagsIntercept();
  mockRecentlyVisitedIntercept();
  mockResourceCountsIntercept();
  mockFeatureViewsIntercept();
  mockFeatureViewDetailsIntercept();
};

const mockEmptyStatesIntercept = (project = fsProjectName) => {
  // Mock empty resource counts
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/metrics/resource_counts?project=${project}*`,
    {
      project,
      counts: {
        entities: 0,
        dataSources: 0,
        savedDatasets: 0,
        features: 0,
        featureViews: 0,
        featureServices: 0,
      },
    },
  ).as('getEmptyResourceCounts');

  // Mock empty popular tags
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/metrics/popular_tags?project=${project}&limit=4*`,
    {
      popular_tags: [],
      metadata: {
        totalFeatureViews: 0,
        totalTags: 0,
        limit: 4,
      },
    },
  ).as('getEmptyPopularTags');

  // Mock empty recently visited
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/metrics/recently_visited?project=${project}*`,
    {
      visits: [],
      pagination: {
        totalCount: 0,
      },
    },
  ).as('getEmptyRecentlyVisited');
};

describe('Feature Store Metrics Overview', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockAllMetricsIntercepts();
  });

  it('should display metrics overview page with correct title and content', () => {
    featureStoreGlobal.visitOverview(fsProjectName);
    featureStoreGlobal.findHeading().should('have.text', 'Overview');
    featureStoreGlobal.findProjectSelector().should('exist');
    featureStoreGlobal.findProjectSelector().click();
    featureStoreGlobal.findProjectSelectorDropdown().should('contain.text', fsProjectName);
  });

  it('should display resource counts section with correct data', () => {
    featureStoreGlobal.visitOverview(fsProjectName);
    cy.wait('@getResourceCounts');

    featureMetricsOverview.shouldHaveEntitiesCount(2);
    featureMetricsOverview.shouldHaveDataSourcesCount(3);
    featureMetricsOverview.shouldHaveSavedDatasetsCount(0);
    featureMetricsOverview.shouldHaveFeaturesCount(10);
    featureMetricsOverview.shouldHaveFeatureViewsCount(2);
    featureMetricsOverview.shouldHaveFeatureServicesCount(3);
  });

  it('should display popular tags section with correct data', () => {
    featureStoreGlobal.visitOverview(fsProjectName);
    cy.wait('@getPopularTags');

    featureMetricsOverview.shouldHavePopularTagCard('team', 'driver_performance');

    featureMetricsOverview.shouldHaveFeatureViewInPopularTag(
      'team',
      'driver_performance',
      'driver_hourly_stats',
    );
    featureMetricsOverview.shouldHaveFeatureViewInPopularTag(
      'team',
      'driver_performance',
      'driver_hourly_stats_fresh',
    );

    featureMetricsOverview.shouldHaveFeatureViewsCountInPopularTag('team', 'driver_performance', 2);
  });

  it('should display recently visited section with correct data', () => {
    featureStoreGlobal.visitOverview(fsProjectName);
    cy.wait('@getRecentlyVisited');

    featureMetricsOverview.shouldHaveRecentlyVisitedTitle();
    featureMetricsOverview.shouldHaveRecentlyVisitedTable();

    featureMetricsOverview.shouldHaveRecentlyVisitedRow('driver_hourly_stats');
    featureMetricsOverview.shouldHaveRecentlyVisitedRow('driver');
    featureMetricsOverview.shouldHaveRecentlyVisitedRow('__dummy');
  });

  it('should handle empty popular tags state', () => {
    mockEmptyStatesIntercept();

    featureStoreGlobal.visitOverview(fsProjectName);
    cy.wait('@getEmptyPopularTags');

    featureMetricsOverview.shouldHavePopularTagsTitle();
    featureMetricsOverview.shouldShowPopularTagsEmptyState();
  });

  it('should handle empty recently visited resources state', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/metrics/recently_visited?project=${fsProjectName}*`,
      {
        visits: [],
        pagination: {
          totalCount: 0,
        },
      },
    ).as('getEmptyRecentlyVisited');

    featureStoreGlobal.visitOverview(fsProjectName);
    cy.wait('@getEmptyRecentlyVisited');

    featureMetricsOverview.shouldHaveRecentlyVisitedTitle();
    featureMetricsOverview.shouldShowRecentlyVisitedEmptyState();
  });

  it('should handle empty resource counts state', () => {
    mockEmptyStatesIntercept();

    featureStoreGlobal.visitOverview(fsProjectName);
    cy.wait('@getEmptyResourceCounts');

    featureMetricsOverview.shouldHaveEntitiesCount(0);
    featureMetricsOverview.shouldHaveDataSourcesCount(0);
    featureMetricsOverview.shouldHaveSavedDatasetsCount(0);
    featureMetricsOverview.shouldHaveFeaturesCount(0);
    featureMetricsOverview.shouldHaveFeatureViewsCount(0);
    featureMetricsOverview.shouldHaveFeatureServicesCount(0);
  });

  it('should navigate to feature view details when clicking on feature view in recently visited', () => {
    featureStoreGlobal.visitOverview(fsProjectName);
    cy.wait('@getRecentlyVisited');
    featureMetricsOverview.findRecentlyVisitedRow('driver_hourly_stats').findResourceLink().click();
    cy.url().should('include', `/featureStore/featureViews/${fsProjectName}/driver_hourly_stats`);
  });

  it('should display correct metadata in popular tags section', () => {
    featureStoreGlobal.visitOverview(fsProjectName);
    cy.wait('@getPopularTags');

    cy.findByText('View all (2)').should('be.visible');
  });

  it('should handle API errors gracefully', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/metrics/popular_tags?project=${fsProjectName}&limit=4*`,
      {
        statusCode: 500,
        body: { detail: 'Internal server error' },
      },
    ).as('getPopularTagsError');

    featureStoreGlobal.visitOverview(fsProjectName);
    cy.wait('@getPopularTagsError');
    featureMetricsOverview.shouldHaveErrorLoadingPopularTags();
  });
});

describe('Feature Store Metrics Overview - Project Switching', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockAllMetricsIntercepts();
  });

  it('should refresh metrics data when project changes', () => {
    const newProject = 'new-project';

    mockEmptyStatesIntercept(newProject);

    featureStoreGlobal.visitOverview(fsProjectName);
    cy.wait('@getPopularTags');

    featureStoreGlobal.findProjectSelector().click();
    cy.findByText(newProject).click();

    cy.wait('@getEmptyResourceCounts');
    cy.wait('@getEmptyPopularTags');
    cy.wait('@getEmptyRecentlyVisited');

    featureStoreGlobal.findProjectSelector().should('contain.text', newProject);

    featureMetricsOverview.shouldShowPopularTagsEmptyState();
    featureMetricsOverview.shouldShowRecentlyVisitedEmptyState();
  });
});

describe('Feature Store Metrics Overview Empty States', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockEmptyStatesIntercept();
  });

  it('should handle all empty states simultaneously', () => {
    featureStoreGlobal.visitOverview(fsProjectName);

    featureMetricsOverview.shouldDisplayResourceCounts();
    featureMetricsOverview.shouldHavePopularTagsTitle();
    featureMetricsOverview.shouldHaveRecentlyVisitedTitle();

    featureMetricsOverview.shouldShowPopularTagsEmptyState();
    featureMetricsOverview.shouldShowRecentlyVisitedEmptyState();

    featureMetricsOverview.shouldHaveEntitiesCount(0);
    featureMetricsOverview.shouldHaveDataSourcesCount(0);
    featureMetricsOverview.shouldHaveSavedDatasetsCount(0);
    featureMetricsOverview.shouldHaveFeaturesCount(0);
    featureMetricsOverview.shouldHaveFeatureViewsCount(0);
    featureMetricsOverview.shouldHaveFeatureServicesCount(0);
  });
});
