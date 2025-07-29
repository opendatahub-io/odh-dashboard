/* eslint-disable camelcase */

import { featureServicesTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureService';
import { featureStoreGlobal } from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal';
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
    'GET /api/service/featurestore/:namespace/:serviceName/api/:apiVersion/feature_services',
    {
      path: { namespace: k8sNamespace, serviceName: fsName, apiVersion: 'v1' },
    },
    {
      featureServices: [mockFeatureService()],
      pagination: {
        totalCount: 1,
        totalPages: 1,
      },
    },
  );
};

describe('Feature Services', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercept();
  });

  it('should display feature services page with correct title and content', () => {
    featureStoreGlobal.visitFeatureServices(fsProjectName);

    featureStoreGlobal.findHeading().should('have.text', 'Feature services');

    featureStoreGlobal.findProjectSelector().should('exist');
    featureStoreGlobal.findProjectSelector().click();
    featureStoreGlobal.findProjectSelectorDropdown().should('contain.text', fsProjectName);
  });

  it('should display feature services table with mocked data', () => {
    featureStoreGlobal.visitFeatureServices(fsProjectName);

    featureServicesTable.findTable().should('exist');

    featureServicesTable.shouldHaveFeatureServiceCount(1);

    const mockFeatureServiceName = 'credit_assessment_v1';
    const featureServiceRow = featureServicesTable.findRow(mockFeatureServiceName);

    featureServiceRow.shouldHaveFeatureServiceName(mockFeatureServiceName);
    featureServiceRow.shouldHaveFeaturesViewsCount(5); // Based on mock data - 5 feature views
    featureServiceRow.shouldHaveOwner('risk-team@company.com');

    featureServiceRow.shouldHaveTag('version = v1');
    featureServiceRow.shouldHaveTag('team = risk');
    featureServiceRow.shouldHaveTag('use_case = credit_scoring');
  });

  it('should allow filtering by feature service name', () => {
    featureStoreGlobal.visitFeatureServices(fsProjectName);

    const toolbar = featureServicesTable.findToolbar();

    toolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Feature service').click();
    toolbar.findSearchInput().type('credit');
    featureServicesTable.shouldHaveFeatureServiceCount(1);

    toolbar.findSearchInput().clear().type('nonexistent');
    featureServicesTable.shouldHaveFeatureServiceCount(0);
  });

  it('should allow filtering by tags', () => {
    featureStoreGlobal.visitFeatureServices(fsProjectName);

    const toolbar = featureServicesTable.findToolbar();

    toolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Tags').click();
    toolbar.findSearchInput().type('team=risk');
    featureServicesTable.shouldHaveFeatureServiceCount(1);

    toolbar.findSearchInput().clear().type('nonexistent');
    featureServicesTable.shouldHaveFeatureServiceCount(0);
  });

  it('should display empty state when no feature services are available', () => {
    // Override the intercept to return empty feature services
    cy.interceptOdh(
      'GET /api/service/featurestore/:namespace/:serviceName/api/:apiVersion/feature_services',
      {
        path: { namespace: k8sNamespace, serviceName: fsName, apiVersion: 'v1' },
      },
      {
        featureServices: [],
        pagination: {
          totalCount: 0,
          totalPages: 0,
        },
      },
    );

    featureStoreGlobal.visitFeatureServices(fsProjectName);

    featureStoreGlobal.shouldBeEmpty();
  });
});
