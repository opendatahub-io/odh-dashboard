/* eslint-disable camelcase */

import {
  featureServiceDetails,
  featureServiceDetailsBreadcrumb,
  featureServiceDetailsPage,
  featureServiceDetailsTabs,
} from '#~/__tests__/cypress/cypress/pages/featureStore/featureServiceDetails';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { ProjectModel, ServiceModel } from '#~/__tests__/cypress/cypress/utils/models';
import { asClusterAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockFeatureStoreService } from '#~/__mocks__/mockFeatureStoreService';
import { mockFeatureStoreProject } from '#~/__mocks__/mockFeatureStoreProject';
import { mockFeatureService } from '#~/__mocks__/mockFeatureServices';
import { mockFeatureStore } from '#~/__mocks__/mockFeatureStore';
import { mockFeatureView } from '#~/__mocks__/mockFeatureViews';

const k8sNamespace = 'default';
const fsName = 'demo';
const fsProjectName = 'credit_scoring_local';
const featureServiceName = 'credit_assessment_v1';

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
    'GET /api/service/featurestore/:namespace/:serviceName/api/:apiVersion/feature_services',
    {
      path: { namespace: k8sNamespace, serviceName: fsName, apiVersion: 'v1' },
    },
    {
      featureServices: [mockFeatureService({ name: featureServiceName })],
      pagination: {
        totalCount: 1,
        totalPages: 1,
      },
      relationships: {},
    },
  );

  cy.interceptOdh(
    'GET /api/service/featurestore/:namespace/:serviceName/api/:apiVersion/feature_services/:featureServiceName',
    {
      path: {
        namespace: k8sNamespace,
        serviceName: fsName,
        apiVersion: 'v1',
        featureServiceName,
      },
    },
    mockFeatureService({
      name: featureServiceName,
    }),
  );

  cy.interceptOdh(
    'GET /api/service/featurestore/:namespace/:serviceName/api/:apiVersion/feature_views',
    {
      path: { namespace: k8sNamespace, serviceName: fsName, apiVersion: 'v1' },
    },
    {
      featureViews: [mockFeatureView()],
      pagination: {
        totalCount: 1,
        totalPages: 1,
      },
    },
  );
};

describe('Feature Service Details', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercept();
  });

  describe('Page Loading and Basic Elements', () => {
    it('should display feature service details page with correct title and breadcrumb', () => {
      featureServiceDetails.visit(fsProjectName, featureServiceName);
      featureServiceDetails.shouldHaveTitle(featureServiceName);

      featureServiceDetailsBreadcrumb
        .findFeatureServicesLink()
        .should('be.visible')
        .should('have.attr', 'href', '/featureStore/featureServices');

      featureServiceDetailsBreadcrumb.shouldShowCurrentService(featureServiceName);
    });

    it('should navigate back to feature services when breadcrumb link is clicked', () => {
      featureServiceDetails.visit(fsProjectName, featureServiceName);
      featureServiceDetailsBreadcrumb.clickFeatureServicesLink();
      cy.url().should('include', '/featureStore/featureServices');
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      featureServiceDetails.visit(fsProjectName, featureServiceName);
    });

    it('should default to Details tab being selected', () => {
      featureServiceDetailsTabs.shouldHaveDetailsTabSelected();
      featureServiceDetailsTabs.shouldHaveDetailsTabContent();
    });

    it('should switch to Feature Views tab when clicked', () => {
      featureServiceDetailsTabs.clickFeatureViewsTab();
      featureServiceDetailsTabs.shouldHaveFeatureViewsTabSelected();
      featureServiceDetailsTabs.shouldHaveFeatureViewsTabContent();
    });

    it('should be able to switch back to Details tab', () => {
      featureServiceDetailsTabs.clickFeatureViewsTab();
      featureServiceDetailsTabs.clickDetailsTab();
      featureServiceDetailsTabs.shouldHaveDetailsTabSelected();
      featureServiceDetailsTabs.shouldHaveDetailsTabContent();
    });
  });

  describe('Details Tab Content', () => {
    beforeEach(() => {
      featureServiceDetails.visit(fsProjectName, featureServiceName);
    });

    it('should display feature service overview information', () => {
      featureServiceDetailsPage.findOverviewLabel().should('contain.text', 'Overview');
      featureServiceDetailsPage.findOverviewValue().should('contain.text', 'features');
      featureServiceDetailsPage.findOverviewValue().should('contain.text', 'feature views');
    });

    it('should display created at timestamp', () => {
      featureServiceDetailsPage.findCreatedAtLabel().should('contain.text', 'Created at');
    });

    it('should display updated at timestamp', () => {
      featureServiceDetailsPage.findUpdatedAtLabel().should('contain.text', 'Updated at');
      featureServiceDetailsPage
        .findUpdatedAtValue()
        .should('contain.text', 'Jun 30, 2025, 7:46 AM UTC');
    });
  });

  describe('Feature Views Tab Content', () => {
    beforeEach(() => {
      featureServiceDetails.visit(fsProjectName, featureServiceName);
      featureServiceDetailsTabs.clickFeatureViewsTab();
    });

    it('should display feature views list when Feature Views tab is selected', () => {
      cy.findByTestId('feature-views-table').should('exist');
    });
  });
});
