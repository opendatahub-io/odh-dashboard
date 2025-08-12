/* eslint-disable camelcase */

import { featureViewsTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureView';
import { featureStoreGlobal } from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { ProjectModel, ServiceModel } from '#~/__tests__/cypress/cypress/utils/models';
import { asClusterAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockFeatureStoreService } from '#~/__mocks__/mockFeatureStoreService';
import { mockFeatureStore } from '#~/__mocks__/mockFeatureStore';
import { mockFeatureStoreProject } from '#~/__mocks__/mockFeatureStoreProject';
import { mockFeatureView } from '#~/__mocks__/mockFeatureViews';

const k8sNamespace = 'default';
const fsName = 'demo';
const fsProjectName = 'credit_scoring_local';

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
            name: 'zipcode_features',
            entities: ['user_id'],
          },
        }),
      ],
      relationships: {
        zipcode_features: [
          {
            source: { type: 'feature', name: 'city' },
            target: { type: 'featureView', name: 'zipcode_features' },
          },
          {
            source: { type: 'feature', name: 'state' },
            target: { type: 'featureView', name: 'zipcode_features' },
          },
          {
            source: { type: 'feature', name: 'location_type' },
            target: { type: 'featureView', name: 'zipcode_features' },
          },
          {
            source: { type: 'feature', name: 'tax_returns_filed' },
            target: { type: 'featureView', name: 'zipcode_features' },
          },
          {
            source: { type: 'feature', name: 'population' },
            target: { type: 'featureView', name: 'zipcode_features' },
          },
          {
            source: { type: 'feature', name: 'total_wages' },
            target: { type: 'featureView', name: 'zipcode_features' },
          },
        ],
      },
      pagination: {
        totalCount: 1,
        totalPages: 1,
      },
    },
  );
};

describe('Feature Views', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercept();
  });

  it('should display feature views page with correct title and content', () => {
    featureStoreGlobal.visitFeatureViews(fsProjectName);

    featureStoreGlobal.findHeading().should('have.text', 'Feature views');

    featureStoreGlobal.findProjectSelector().should('exist');
    featureStoreGlobal.findProjectSelector().click();
    featureStoreGlobal.findProjectSelectorDropdown().should('contain.text', fsProjectName);
  });

  it('should display feature views table with mocked data', () => {
    featureStoreGlobal.visitFeatureViews(fsProjectName);

    featureViewsTable.findTable().should('exist');

    featureViewsTable.shouldHaveFeatureViewCount(1);

    const mockFeatureViewName = 'zipcode_features';
    const featureViewRow = featureViewsTable.findRow(mockFeatureViewName);

    featureViewRow.shouldHaveFeatureViewName(mockFeatureViewName);
    featureViewRow.shouldHaveFeaturesCount(6); // Based on m  ock data
    featureViewRow.shouldHaveOwner('risk-team@company.com');

    featureViewRow.findTags().within(() => {
      cy.contains('pii=false');
      cy.contains('team=risk');
      cy.contains('domain=demographics');
    });
  });

  it('should allow filtering by feature view name', () => {
    featureStoreGlobal.visitFeatureViews(fsProjectName);

    const toolbar = featureViewsTable.findToolbar();

    toolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Feature view').click();
    toolbar.findSearchInput().type('zipcode');
    featureViewsTable.shouldHaveFeatureViewCount(1);

    toolbar.findSearchInput().clear().type('nonexistent');
    featureViewsTable.shouldHaveFeatureViewCount(0);
  });

  it('should allow filtering by tags', () => {
    featureStoreGlobal.visitFeatureViews(fsProjectName);

    const toolbar = featureViewsTable.findToolbar();

    toolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Tags').click();
    toolbar.findSearchInput().type('pii');
    featureViewsTable.shouldHaveFeatureViewCount(1);

    toolbar.findSearchInput().clear().type('nonexistent=tag');
    featureViewsTable.shouldHaveFeatureViewCount(0);
  });

  it('should display empty state when no feature views are available', () => {
    // Override the intercept to return empty feature views
    cy.interceptOdh(
      'GET /api/service/featurestore/:namespace/:serviceName/api/:apiVersion/feature_views',
      {
        path: { namespace: k8sNamespace, serviceName: fsName, apiVersion: 'v1' },
      },
      {
        featureViews: [],
        relationships: {},
        pagination: {
          totalCount: 0,
          totalPages: 0,
        },
      },
    );

    featureStoreGlobal.visitFeatureViews(fsProjectName);

    featureStoreGlobal.shouldBeEmpty();
  });
});
