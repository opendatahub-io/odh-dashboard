/* eslint-disable camelcase */

import { mockFeatureStoreService } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreService';
import { mockFeatureStore } from '@odh-dashboard/feature-store/mocks/mockFeatureStore';
import { mockFeatureStoreProject } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreProject';
import { mockFeatureView } from '@odh-dashboard/feature-store/mocks/mockFeatureViews';
import { mockDataSource } from '@odh-dashboard/feature-store/mocks/mockDataSources';
import { featureStoreGlobal } from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal';
import {
  featureDataSourcesTable,
  dataSourceDetailsPage,
} from '#~/__tests__/cypress/cypress/pages/featureStore/featureDataSource';
import { featureDataSourceDetails } from '#~/__tests__/cypress/cypress/pages/featureStore/featureDataSourceDetails';
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
        mockFeatureStoreProject({ spec: { name: fsProjectName2 } }),
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

const mockAllDataSourcesIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/data_sources/all?include_relationships=true*`,
    {
      dataSources: [
        mockDataSource({ project: fsProjectName }),
        mockDataSource({
          name: 'transaction_data',
          project: fsProjectName2,
          type: 'BATCH_FILE',
          description: 'Transaction data for fraud detection',
          owner: 'fraud-team@company.com',
        }),
        mockDataSource({
          name: 'user_profile',
          project: fsProjectName,
          type: 'REQUEST_SOURCE',
          description: 'User profile data for real-time features',
          owner: 'ml-team@company.com',
        }),
      ],
      pagination: {
        page: 1,
        limit: 50,
        total_count: 3,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
      relationships: {
        loan_data: [
          {
            source: { type: 'dataSource', name: 'loan_data' },
            target: { type: 'featureView', name: 'loan_features' },
          },
          {
            source: { type: 'dataSource', name: 'loan_data' },
            target: { type: 'featureView', name: 'credit_score_features' },
          },
        ],
        transaction_data: [
          {
            source: { type: 'dataSource', name: 'transaction_data' },
            target: { type: 'featureView', name: 'fraud_detection_features' },
          },
        ],
        user_profile: [
          {
            source: { type: 'dataSource', name: 'user_profile' },
            target: { type: 'featureView', name: 'user_profile_features' },
          },
        ],
      },
    },
  ).as('getAllDataSources');
};

const mockProjectDataSourcesIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/data_sources?project=${fsProjectName}&include_relationships=true*`,
    {
      dataSources: [
        mockDataSource(),
        mockDataSource({
          name: 'user_profile',
          type: 'REQUEST_SOURCE',
          description: 'User profile data for real-time features',
          owner: 'ml-team@company.com',
        }),
      ],
      pagination: {
        page: 1,
        limit: 50,
        total_count: 2,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
      relationships: {
        loan_data: [
          {
            source: { type: 'dataSource', name: 'loan_data' },
            target: { type: 'featureView', name: 'loan_features' },
          },
          {
            source: { type: 'dataSource', name: 'loan_data' },
            target: { type: 'featureView', name: 'credit_score_features' },
          },
        ],
        user_profile: [
          {
            source: { type: 'dataSource', name: 'user_profile' },
            target: { type: 'featureView', name: 'user_profile_features' },
          },
        ],
      },
    },
  ).as('getProjectDataSources');
};

const mockDataSourceDetailsIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/data_sources/loan_data?project=${fsProjectName}&include_relationships=true*`,
    mockDataSource({
      name: 'loan_data',
      type: 'BATCH_FILE',
      description: 'Loan application data including personal and loan characteristics',
      owner: 'risk-team@company.com',
      meta: {
        createdTimestamp: '2025-01-15T10:30:00.000000Z',
        lastUpdatedTimestamp: '2025-01-15T10:30:00.000000Z',
      },
      project: fsProjectName,
    }),
  ).as('getDataSourceDetails');
};

const mockDataSourceFeatureViewsIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/feature_views?project=${fsProjectName}&data_source=loan_data*`,
    {
      featureViews: [
        mockFeatureView({
          spec: {
            ...mockFeatureView().spec,
            name: 'loan_features',
            entities: ['user_id'],
          },
        }),
        mockFeatureView({
          spec: {
            ...mockFeatureView().spec,
            name: 'credit_score_features',
            entities: ['user_id'],
          },
        }),
      ],
      relationships: {
        loan_features: [
          {
            source: { type: 'feature', name: 'loan_amount' },
            target: { type: 'featureView', name: 'loan_features' },
          },
          {
            source: { type: 'feature', name: 'interest_rate' },
            target: { type: 'featureView', name: 'loan_features' },
          },
        ],
        credit_score_features: [
          {
            source: { type: 'feature', name: 'credit_score' },
            target: { type: 'featureView', name: 'credit_score_features' },
          },
          {
            source: { type: 'feature', name: 'payment_history' },
            target: { type: 'featureView', name: 'credit_score_features' },
          },
        ],
      },
      pagination: {
        totalCount: 2,
        totalPages: 1,
      },
    },
  ).as('getDataSourceFeatureViews');
};

describe('Feature Data Sources for all projects', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockAllDataSourcesIntercept();
  });

  it('should display all data sources when no project is selected', () => {
    featureStoreGlobal.visitDataSources();

    featureDataSourcesTable.findTable().should('be.visible');
    featureDataSourcesTable.shouldHaveDataSourceCount(3);
  });

  it('should display project column when viewing all projects', () => {
    featureStoreGlobal.visitDataSources();
    featureDataSourcesTable.findTable().should('be.visible');
    featureDataSourcesTable.findTable().find('thead').should('contain.text', 'Project');
    featureDataSourcesTable.findRow('loan_data').shouldHaveProject(fsProjectName);
    featureDataSourcesTable.findRow('transaction_data').shouldHaveProject(fsProjectName2);
  });

  it('should navigate to feature view when clicking feature views popover in all projects view', () => {
    featureStoreGlobal.visitDataSources();

    featureDataSourcesTable.findTable().should('be.visible');
    featureDataSourcesTable
      .findRow('loan_data')
      .clickFeatureViewsPopover()
      .shouldShowFeatureViewsPopover()
      .clickFeatureViewInPopover('loan_features')
      .shouldNavigateToFeatureView('loan_features', 'credit_scoring_local');
  });

  it('should navigate to data source details when clicking data source name in all projects view', () => {
    mockDataSourceDetailsIntercept();
    featureStoreGlobal.visitDataSources();

    featureDataSourcesTable.findTable().should('be.visible');
    featureDataSourcesTable.findRow('loan_data').findDataSourceLink().click();
    cy.url().should('include', '/featureStore/dataSources/credit_scoring_local');
    featureDataSourceDetails
      .shouldHaveApplicationsPageDescription(
        'Loan application data including personal and loan characteristics',
      )
      .shouldHaveDataSourceConnector('BATCH_FILE')
      .shouldHaveOwner('risk-team@company.com');
    featureDataSourceDetails.findInteractiveExample().should('be.visible');
    featureDataSourceDetails.findBreadcrumbLink().should('be.visible');
    featureDataSourceDetails.findBreadcrumbItem().should('contain.text', 'loan_data');
  });

  it('should navigate back to data sources page when clicking breadcrumb link', () => {
    mockDataSourceDetailsIntercept();
    featureStoreGlobal.visitDataSources();
    featureDataSourcesTable.findTable().should('be.visible');
    featureDataSourcesTable.findRow('loan_data').findDataSourceLink().click();
    cy.url().should('include', '/featureStore/dataSources/credit_scoring_local');

    featureDataSourceDetails.findBreadcrumbLink().should('be.visible');
    featureDataSourceDetails.findBreadcrumbItem().should('contain.text', 'loan_data');
    featureDataSourceDetails.findBreadcrumbLink().click();

    cy.url().should('include', '/featureStore/dataSources');
    featureStoreGlobal.findHeading().should('have.text', 'Data Sources');
    featureDataSourcesTable.findTable().should('be.visible');
  });
});

describe('Feature Data Sources', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockProjectDataSourcesIntercept();
  });

  it('should display feature data sources page with correct title and content', () => {
    featureStoreGlobal.visitDataSources(fsProjectName);
    featureStoreGlobal.findHeading().should('have.text', 'Data Sources');
    featureStoreGlobal.findProjectSelector().should('exist');
    featureStoreGlobal.findProjectSelector().click();
    featureStoreGlobal.findProjectSelectorDropdown().should('contain.text', fsProjectName);
  });

  it('should display data sources table with data', () => {
    featureStoreGlobal.visitDataSources(fsProjectName);
    featureDataSourcesTable.findTable().should('be.visible');
    featureDataSourcesTable.shouldHaveDataSourceCount(2);
    featureDataSourcesTable
      .findRow('loan_data')
      .shouldHaveDataSourceName('loan_data')
      .shouldHaveType('File source')
      .shouldHaveOwner('risk-team@company.com');
    featureDataSourcesTable
      .findRow('user_profile')
      .shouldHaveDataSourceName('user_profile')
      .shouldHaveType('Request source')
      .shouldHaveOwner('ml-team@company.com');
  });

  it('should handle empty data sources list', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/data_sources?project=${fsProjectName}&include_relationships=true*`,
      {
        dataSources: [],
        pagination: {
          page: 1,
          limit: 50,
          total_count: 0,
          total_pages: 0,
          has_next: false,
          has_previous: false,
        },
        relationships: {},
      },
    ).as('getEmptyProjectDataSources');

    featureStoreGlobal.visitDataSources(fsProjectName);
    featureDataSourcesTable.shouldHaveDataSourceCount(0);
    featureDataSourcesTable.findEmptyState().should('exist');
  });

  it('should navigate to feature view when clicking feature views popover', () => {
    featureStoreGlobal.visitDataSources(fsProjectName);

    featureDataSourcesTable.findTable().should('be.visible');
    featureDataSourcesTable
      .findRow('loan_data')
      .clickFeatureViewsPopover()
      .shouldShowFeatureViewsPopover()
      .clickFeatureViewInPopover('loan_features')
      .shouldNavigateToFeatureView('loan_features', 'credit_scoring_local');
  });

  it('should handle data source not found with proper error message', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/data_sources/nonexistent?project=${fsProjectName}&include_relationships=true*`,
      {
        statusCode: 404,
        body: { detail: `Data source nonexistent does not exist in project ${fsProjectName}` },
      },
    ).as('getDataSourceNotFound');

    cy.visit(
      `/featureStore/dataSources/${fsProjectName}/nonexistent?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.findByText(`Data source nonexistent does not exist in project ${fsProjectName}`).should(
      'be.visible',
    );
  });

  it('should filter data sources by type', () => {
    featureStoreGlobal.visitDataSources(fsProjectName);
    featureDataSourcesTable.findTable().should('be.visible');

    featureDataSourcesTable.findToolbar().findFilterDropdown().click();
    cy.findByRole('menuitem', { name: 'Data source connector' }).click();
    cy.findByRole('textbox').type('File source');

    featureDataSourcesTable.shouldHaveDataSourceCount(1);
    featureDataSourcesTable.findRow('loan_data').findDataSourceName().should('be.visible');

    featureDataSourcesTable.findToolbarClearFiltersButton().should('exist');
    featureDataSourcesTable.findToolbarClearFiltersButton().click();
    featureDataSourcesTable.shouldHaveDataSourceCount(2);
  });
});

describe('Data Source Feature Views Tab', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockDataSourceDetailsIntercept();
    mockDataSourceFeatureViewsIntercept();
  });

  it('should display feature views for the data source', () => {
    cy.visit(
      `/featureStore/dataSources/${fsProjectName}/loan_data?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getDataSourceDetails');

    featureDataSourceDetails.clickFeatureViewsTab();
    cy.wait('@getDataSourceFeatureViews');
    featureDataSourceDetails.findFeatureViewsTabContent().within(() => {
      dataSourceDetailsPage.shouldShowFeatureViewsTable();
      dataSourceDetailsPage.findFeatureViewRow('loan_features').should('be.visible');
    });
  });

  it('should display empty state when no feature views exist for data source', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/feature_views?project=${fsProjectName}&data_source=loan_data*`,
      {
        featureViews: [],
        relationships: {},
        pagination: {
          totalCount: 0,
          totalPages: 0,
        },
      },
    ).as('getEmptyDataSourceFeatureViews');

    cy.visit(
      `/featureStore/dataSources/${fsProjectName}/loan_data?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getDataSourceDetails');
    featureDataSourceDetails.clickFeatureViewsTab();
    cy.wait('@getEmptyDataSourceFeatureViews');
    featureDataSourceDetails.findFeatureViewsTabContent().within(() => {
      dataSourceDetailsPage.shouldShowEmptyState();
    });
  });

  it('should only call feature views API when tab is clicked', () => {
    cy.visit(
      `/featureStore/dataSources/${fsProjectName}/loan_data?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getDataSourceDetails');

    cy.get('@getDataSourceFeatureViews.all').should('have.length', 0);
    featureDataSourceDetails.clickFeatureViewsTab();
    cy.wait('@getDataSourceFeatureViews');
    cy.get('@getDataSourceFeatureViews.all').should('have.length.at.least', 1);
    featureDataSourceDetails.findFeatureViewsTabContent().within(() => {
      dataSourceDetailsPage.shouldShowFeatureViewsTable();
    });
  });

  it('should navigate to feature view details when clicking on feature view name', () => {
    cy.visit(
      `/featureStore/dataSources/${fsProjectName}/loan_data?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getDataSourceDetails');
    featureDataSourceDetails.clickFeatureViewsTab();
    cy.wait('@getDataSourceFeatureViews');
    featureDataSourceDetails.findFeatureViewsTabContent().within(() => {
      dataSourceDetailsPage.clickFeatureView('loan_features');
    });
    dataSourceDetailsPage.shouldNavigateToFeatureView('loan_features', fsProjectName);
  });
});

describe('Data Source Details Tab', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockDataSourceDetailsIntercept();
  });

  it('should display data source details with correct information', () => {
    cy.visit(
      `/featureStore/dataSources/${fsProjectName}/loan_data?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getDataSourceDetails');

    featureDataSourceDetails.findDetailsTab().should('be.visible');
    featureDataSourceDetails.findDetailsTabContent().within(() => {
      featureDataSourceDetails.shouldHaveDataSourceConnector('BATCH_FILE');
      featureDataSourceDetails.shouldHaveOwner('risk-team@company.com');
      featureDataSourceDetails.findLastModified().should('be.visible');
      featureDataSourceDetails.findCreated().should('be.visible');
    });
  });

  it('should display file URL for file-based data sources', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/data_sources/loan_data?project=${fsProjectName}&include_relationships=true*`,
      mockDataSource({
        name: 'loan_data',
        type: 'BATCH_FILE',
        fileOptions: {
          uri: 'data/loan_table.parquet',
        },
        project: fsProjectName,
      }),
    ).as('getDataSourceWithFileUrl');

    cy.visit(
      `/featureStore/dataSources/${fsProjectName}/loan_data?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getDataSourceWithFileUrl');

    featureDataSourceDetails.findDetailsTabContent().within(() => {
      featureDataSourceDetails.findFileUrl().should('be.visible');
      featureDataSourceDetails.shouldHaveFileUrl('data/loan_table.parquet');
    });
  });

  it('should display batch data source for stream data sources', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/data_sources/stream_data?project=${fsProjectName}&include_relationships=true*`,
      mockDataSource({
        name: 'stream_data',
        type: 'STREAM_KAFKA',
        batchSource: {
          name: 'batch_data',
          type: 'BATCH_FILE',
          meta: {
            createdTimestamp: '2025-01-15T10:30:00.000000Z',
            lastUpdatedTimestamp: '2025-01-15T10:30:00.000000Z',
          },
        },
        project: fsProjectName,
      }),
    ).as('getStreamDataSource');

    cy.visit(
      `/featureStore/dataSources/${fsProjectName}/stream_data?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getStreamDataSource');

    featureDataSourceDetails.findDetailsTabContent().within(() => {
      featureDataSourceDetails.findBatchDataSource().should('be.visible');
      featureDataSourceDetails.shouldHaveBatchDataSource('batch_data');
    });
  });
});

describe('Data Source Schema Tab', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
  });

  it('should display schema tab for REQUEST_SOURCE data sources', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/data_sources/user_profile?project=${fsProjectName}&include_relationships=true*`,
      mockDataSource({
        name: 'user_profile',
        type: 'REQUEST_SOURCE',
        requestDataOptions: {
          schema: [
            {
              name: 'user_id',
              valueType: 'STRING',
              tags: { join_key: 'true' },
            },
            {
              name: 'user_age',
              valueType: 'INT64',
              tags: { demographic: 'true' },
            },
          ],
        },
        project: fsProjectName,
      }),
    ).as('getRequestDataSource');

    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/feature_views?project=${fsProjectName}&data_source=user_profile*`,
      {
        featureViews: [],
        relationships: {},
        pagination: {
          totalCount: 0,
          totalPages: 0,
        },
      },
    ).as('getUserProfileFeatureViews');

    cy.visit(
      `/featureStore/dataSources/${fsProjectName}/user_profile?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getRequestDataSource');
    cy.wait('@getUserProfileFeatureViews');

    featureDataSourceDetails.findSchemaTab().should('be.visible');
    featureDataSourceDetails.clickSchemaTab();
    featureDataSourceDetails.findSchemaTabContent().within(() => {
      cy.findByText('user_id').should('be.visible');
      cy.findByText('STRING').should('be.visible');
      cy.findByText('user_age').should('be.visible');
      cy.findByText('INT64').should('be.visible');
    });
  });

  it('should not display schema tab for non-REQUEST_SOURCE data sources', () => {
    mockDataSourceDetailsIntercept();
    cy.visit(
      `/featureStore/dataSources/${fsProjectName}/loan_data?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getDataSourceDetails');

    featureDataSourceDetails.findSchemaTab().should('not.exist');
  });
});
