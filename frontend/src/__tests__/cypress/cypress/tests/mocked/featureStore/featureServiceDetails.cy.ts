/* eslint-disable camelcase */

import { mockFeatureStoreService } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreService';
import { mockFeatureStoreProject } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreProject';
import { mockFeatureService } from '@odh-dashboard/feature-store/mocks/mockFeatureServices';
import { mockFeatureView } from '@odh-dashboard/feature-store/mocks/mockFeatureViews';
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
import { DataScienceStackComponent } from '#~/concepts/areas/types';

const k8sNamespace = 'default';
const fsName = 'demo';
const fsProjectName = 'credit_scoring_local';
const featureServiceName = 'credit_assessment_v1';

const initIntercept = () => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.FEAST_OPERATOR]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableFeatureStore: false }));

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: k8sNamespace })]),
  );

  cy.intercept('GET', '/api/featurestores', {
    featureStores: [
      {
        name: fsName,
        project: fsName,
        registry: {
          path: `feast-${fsName}-${k8sNamespace}-registry.${k8sNamespace}.svc.cluster.local:443`,
        },
        namespace: k8sNamespace,
        status: {
          conditions: [
            {
              type: 'Registry',
              status: 'True',
              lastTransitionTime: '2025-10-08T21:13:38.158Z',
            },
          ],
        },
      },
    ],
  });

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
    'GET /api/featurestores/:namespace/:projectName/api/:apiVersion/projects',
    {
      path: { namespace: k8sNamespace, projectName: fsName, apiVersion: 'v1' },
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
    'GET /api/featurestores/:namespace/:projectName/api/:apiVersion/feature_services',
    {
      path: { namespace: k8sNamespace, projectName: fsName, apiVersion: 'v1' },
    },
    {
      featureServices: [mockFeatureService({ name: featureServiceName })],
      pagination: {
        totalCount: 1,
        totalPages: 1,
      },
      relationships: {
        [featureServiceName]: [
          {
            source: {
              type: 'featureView',
              name: 'credit_history',
            },
            target: {
              type: 'featureService',
              name: featureServiceName,
            },
          },
          {
            source: {
              type: 'featureView',
              name: 'person_demographics',
            },
            target: {
              type: 'featureService',
              name: featureServiceName,
            },
          },
        ],
      },
    },
  );

  cy.interceptOdh(
    'GET /api/featurestores/:namespace/:projectName/api/:apiVersion/feature_services/:featureServiceName',
    {
      path: {
        namespace: k8sNamespace,
        projectName: fsName,
        apiVersion: 'v1',
        featureServiceName,
      },
    },
    mockFeatureService({
      name: featureServiceName,
      relationships: [
        {
          source: {
            type: 'featureView',
            name: 'credit_history',
          },
          target: {
            type: 'featureService',
            name: featureServiceName,
          },
        },
        {
          source: {
            type: 'featureView',
            name: 'person_demographics',
          },
          target: {
            type: 'featureService',
            name: featureServiceName,
          },
        },
        {
          source: {
            type: 'entity',
            name: 'dob_ssn',
          },
          target: {
            type: 'featureService',
            name: featureServiceName,
          },
        },
      ],
    }),
  );

  cy.interceptOdh(
    'GET /api/featurestores/:namespace/:projectName/api/:apiVersion/feature_views',
    {
      path: { namespace: k8sNamespace, projectName: fsName, apiVersion: 'v1' },
    },
    {
      featureViews: [mockFeatureView()],
      relationships: {},
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

      featureServiceDetailsBreadcrumb.findBreadcrumbLink().should('be.visible');
      featureServiceDetailsBreadcrumb.shouldShowCurrentService(featureServiceName);
    });

    it('should navigate back to feature services when breadcrumb link is clicked', () => {
      featureServiceDetails.visit(fsProjectName, featureServiceName);
      featureServiceDetailsBreadcrumb.clickFeatureServicesLink();
      cy.url().should('include', '/develop-train/feature-store/feature-services');
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
      featureServiceDetailsPage.findCreatedAtLabel().should('contain.text', 'Created');
    });

    it('should display updated at timestamp', () => {
      featureServiceDetailsPage.findUpdatedAtLabel().should('contain.text', 'Last modified');
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
