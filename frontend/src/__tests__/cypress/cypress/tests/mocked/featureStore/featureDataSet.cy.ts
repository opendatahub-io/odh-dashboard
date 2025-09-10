/* eslint-disable camelcase */

import { mockFeatureStoreService } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreService';
import { mockFeatureStore } from '@odh-dashboard/feature-store/mocks/mockFeatureStore';
import { mockFeatureStoreProject } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreProject';
import { mockDataSets, mockDataSet } from '@odh-dashboard/feature-store/mocks/mockDataSets';
import { mockFeatureService } from '@odh-dashboard/feature-store/mocks/mockFeatureServices';
import { mockFeature } from '@odh-dashboard/feature-store/mocks/mockFeatures';
import { featureStoreGlobal } from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal';
import {
  featureDataSetsTable,
  featureDataSetDetails,
} from '#~/__tests__/cypress/cypress/pages/featureStore/featureDataSet';
import { featureServiceDetails } from '#~/__tests__/cypress/cypress/pages/featureStore/featureServiceDetails';
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
const fsProjectName2 = 'fraud_detection';

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
        mockFeatureStoreProject({ spec: { name: fsProjectName2 } }),
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

const mockAllDataSetsIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/saved_datasets/all?include_relationships=true*`,
    mockDataSets({
      savedDatasets: [
        mockDataSet({ project: fsProjectName }),
        mockDataSet({
          spec: {
            ...mockDataSet().spec,
            name: 'credit_scoring_dataset',
            description: 'Dataset for credit scoring model',
            storage: {
              bigqueryStorage: {
                table: 'credit_scoring_features',
              },
            },
            tags: {
              domain: 'finance',
              model: 'credit-scoring',
              environment: 'production',
            },
            featureServiceName: 'credit-scoring-service',
          },
          project: fsProjectName,
        }),
        mockDataSet({
          spec: {
            ...mockDataSet().spec,
            name: 'fraud_detection_dataset',
            description: 'Dataset for fraud detection',
            storage: {
              redshiftStorage: {
                table: 'fraud_features',
                schema: 'analytics',
                database: 'data_warehouse',
              },
            },
            tags: {
              domain: 'security',
              model: 'fraud-detection',
              priority: 'high',
            },
            featureServiceName: 'fraud-detection-service',
          },
          project: fsProjectName2,
        }),
      ],
    }),
  ).as('getAllDataSets');
};

const mockProjectDataSetsIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/saved_datasets?project=${fsProjectName}&include_relationships=true*`,
    mockDataSets({
      savedDatasets: [
        mockDataSet(),
        mockDataSet({
          spec: {
            ...mockDataSet().spec,
            name: 'credit_scoring_dataset',
            description: 'Dataset for credit scoring model',
            storage: {
              bigqueryStorage: {
                table: 'credit_scoring_features',
              },
            },
            tags: {
              domain: 'finance',
              model: 'credit-scoring',
              environment: 'production',
            },
            featureServiceName: 'credit-scoring-service',
          },
        }),
      ],
    }),
  ).as('getProjectDataSets');
};

const mockDataSetDetailsIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/saved_datasets/test_dataset?project=${fsProjectName}&include_relationships=true*`,
    mockDataSet({
      spec: {
        name: 'test_dataset',
        description: 'Sample dataset for testing',
        features: [
          'credit_history:credit_card_due',
          'credit_history:mortgage_due',
          'credit_history:student_loan_due',
          'person_demographics:person_age',
          'person_demographics:person_income',
        ],
        joinKeys: ['user_id'],
        storage: {
          fileStorage: {
            fileFormat: {
              parquetFormat: {},
            },
            uri: 's3://bucket/path/to/dataset.parquet',
          },
        },
        tags: {
          environment: 'test',
          team: 'data-science',
        },
        featureServiceName: 'test-feature-service',
      },
      meta: {
        createdTimestamp: '2025-01-15T10:30:00.000000Z',
        lastUpdatedTimestamp: '2025-01-15T10:30:00.000000Z',
        maxEventTimestamp: '2025-01-15T10:30:00.000000Z',
        minEventTimestamp: '2025-01-01T00:00:00.000000Z',
      },
      project: fsProjectName,
    }),
  ).as('getDataSetDetails');
};

const mockFeatureDetailsIntercept = () => {
  cy.intercept(
    'GET',
    `**/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/features/credit_history/credit_card_due**`,
    mockFeature({
      name: 'credit_card_due',
      featureView: 'credit_history',
      type: 'FLOAT',
      project: fsProjectName,
      owner: 'data-team@company.com',
      description: 'Credit card due amount',
      tags: {
        domain: 'credit',
        pii: 'false',
        cardinality: 'high',
      },
      featureDefinition: 'SELECT credit_card_due FROM credit_history WHERE user_id = ?',
    }),
  ).as('getFeatureDetails');
};

describe('Feature DataSets for all projects', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockAllDataSetsIntercept();
  });

  it('should handle empty data sets list for all projects', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/saved_datasets/all?include_relationships=true*`,
      {
        savedDatasets: [],
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
    ).as('getEmptyAllDataSets');

    featureStoreGlobal.visitDataSets();
    featureDataSetsTable.shouldHaveDataSetCount(0);
    featureDataSetsTable.findEmptyState().should('exist');
  });

  it('should display all data sets when no project is selected', () => {
    featureStoreGlobal.visitDataSets();

    featureDataSetsTable.findTable().should('be.visible');
    featureDataSetsTable.shouldHaveDataSetCount(3);
  });

  it('should display project column when viewing all projects', () => {
    featureStoreGlobal.visitDataSets();
    featureDataSetsTable.findTable().should('be.visible');
    featureDataSetsTable.findTable().find('thead').should('contain.text', 'Project');
    featureDataSetsTable.findRow('test_dataset').shouldHaveProject(fsProjectName);
    featureDataSetsTable.findRow('fraud_detection_dataset').shouldHaveProject(fsProjectName2);
  });

  it('should navigate to data set details when clicking data set name in all projects view', () => {
    mockDataSetDetailsIntercept();
    featureStoreGlobal.visitDataSets();

    featureDataSetsTable.findTable().should('be.visible');
    featureDataSetsTable.findRow('test_dataset').clickDataSetLink().click();
    cy.url().should('include', '/featureStore/dataSets/credit_scoring_local');
    featureDataSetDetails
      .shouldHaveSourceFeatureService('test-feature-service')
      .shouldHaveStorage('fileStorage')
      .shouldHavePath('s3://bucket/path/to/dataset.parquet');
    featureDataSetDetails.findTags().should('be.visible');
    featureDataSetDetails.findJoinKeys().should('be.visible');
    featureDataSetDetails.findBreadcrumbLink().should('be.visible');
    featureDataSetDetails.findBreadcrumbItem().should('contain.text', 'test_dataset');
  });

  it('should navigate back to data sets page when clicking breadcrumb link', () => {
    mockDataSetDetailsIntercept();
    featureStoreGlobal.visitDataSets();
    featureDataSetsTable.findTable().should('be.visible');
    featureDataSetsTable.findRow('test_dataset').clickDataSetLink().click();
    cy.url().should('include', '/featureStore/dataSets/credit_scoring_local');

    featureDataSetDetails.findBreadcrumbLink().should('be.visible');
    featureDataSetDetails.findBreadcrumbItem().should('contain.text', 'test_dataset');
    featureDataSetDetails.findBreadcrumbLink().click();

    cy.url().should('include', '/featureStore/dataSets');
    featureStoreGlobal.findHeading().should('have.text', 'Datasets');
    featureDataSetsTable.findTable().should('be.visible');
  });
});

describe('Feature DataSets', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockProjectDataSetsIntercept();
  });

  it('should display feature data sets page with correct title and content', () => {
    featureStoreGlobal.visitDataSets(fsProjectName);
    featureStoreGlobal.findHeading().should('have.text', 'Datasets');
    featureStoreGlobal.findProjectSelector().should('exist');
    featureStoreGlobal.findProjectSelector().click();
    featureStoreGlobal.findProjectSelectorDropdown().should('contain.text', fsProjectName);
  });

  it('should display data sets table with data', () => {
    featureStoreGlobal.visitDataSets(fsProjectName);
    featureDataSetsTable.findTable().should('be.visible');
    featureDataSetsTable.shouldHaveDataSetCount(2);
    featureDataSetsTable
      .findRow('test_dataset')
      .shouldHaveDataSetName('test_dataset')
      .shouldHaveSourceFeatureService('test-feature-service');
    featureDataSetsTable
      .findRow('credit_scoring_dataset')
      .shouldHaveDataSetName('credit_scoring_dataset')
      .shouldHaveSourceFeatureService('credit-scoring-service');
  });

  it('should handle empty data sets list', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/saved_datasets?project=${fsProjectName}&include_relationships=true*`,
      {
        savedDatasets: [],
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
    ).as('getEmptyProjectDataSets');

    featureStoreGlobal.visitDataSets(fsProjectName);
    featureDataSetsTable.shouldHaveDataSetCount(0);
    featureDataSetsTable.findEmptyState().should('exist');
  });

  it('should handle data set not found with proper error message', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/saved_datasets/nonexistent?project=${fsProjectName}&include_relationships=true*`,
      {
        statusCode: 404,
        body: { detail: `DataSet nonexistent does not exist in project ${fsProjectName}` },
      },
    ).as('getDataSetNotFound');

    cy.visit(
      `/featureStore/dataSets/${fsProjectName}/nonexistent?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.findByText(`DataSet nonexistent does not exist in project ${fsProjectName}`).should(
      'be.visible',
    );
  });
});

describe('DataSet Details', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
  });

  it('should display data set details with all information', () => {
    mockDataSetDetailsIntercept();

    cy.visit(
      `/featureStore/dataSets/${fsProjectName}/test_dataset?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getDataSetDetails');
    featureDataSetDetails
      .shouldHaveSourceFeatureService('test-feature-service')
      .shouldHaveStorage('fileStorage')
      .shouldHavePath('s3://bucket/path/to/dataset.parquet');

    featureDataSetDetails.findTags().within(() => {
      cy.contains('environment=test');
      cy.contains('team=data-science');
    });

    featureDataSetDetails.findJoinKeys().within(() => {
      cy.contains('user_id');
    });
  });

  it('should display different storage types correctly for BigQuery storage', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/saved_datasets/credit_scoring_dataset?project=${fsProjectName}&include_relationships=true*`,
      mockDataSet({
        spec: {
          ...mockDataSet().spec,
          name: 'credit_scoring_dataset',
          storage: {
            bigqueryStorage: {
              table: 'credit_scoring_features',
            },
          },
        },
        project: fsProjectName,
      }),
    ).as('getBigQueryDataSet');

    cy.visit(
      `/featureStore/dataSets/${fsProjectName}/credit_scoring_dataset?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getBigQueryDataSet');

    featureDataSetDetails
      .shouldHaveStorage('bigqueryStorage')
      .shouldHaveTable('credit_scoring_features');
  });

  it('should display Redshift storage with schema and database for Redshift storage', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/saved_datasets/fraud_detection_dataset?project=${fsProjectName2}&include_relationships=true*`,
      mockDataSet({
        spec: {
          ...mockDataSet().spec,
          name: 'fraud_detection_dataset',
          storage: {
            redshiftStorage: {
              table: 'fraud_features',
              schema: 'analytics',
              database: 'data_warehouse',
            },
          },
        },
        project: fsProjectName2,
      }),
    ).as('getRedshiftDataSet');

    cy.visit(
      `/featureStore/dataSets/${fsProjectName2}/fraud_detection_dataset?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getRedshiftDataSet');

    featureDataSetDetails
      .shouldHaveStorage('redshiftStorage')
      .shouldHaveTable('fraud_features')
      .shouldHaveSchema('analytics')
      .shouldHaveDatabase('data_warehouse');
  });

  it('should display features tab with features table', () => {
    mockDataSetDetailsIntercept();

    cy.visit(
      `/featureStore/dataSets/${fsProjectName}/test_dataset?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getDataSetDetails');

    featureDataSetDetails.findFeaturesTab().click();
    featureDataSetDetails.findFeaturesTabContent().should('be.visible');
    featureDataSetDetails.findFeaturesTable().should('be.visible');

    featureDataSetDetails.findFeaturesTable().within(() => {
      cy.contains('credit_card_due').should('be.visible');
      cy.contains('mortgage_due').should('be.visible');
      cy.contains('student_loan_due').should('be.visible');
      cy.contains('person_age').should('be.visible');
      cy.contains('person_income').should('be.visible');
    });
  });

  it('should navigate to feature service details when clicking feature service link', () => {
    mockDataSetDetailsIntercept();

    cy.interceptOdh(
      'GET /api/service/featurestore/:namespace/:serviceName/api/:apiVersion/feature_services/:featureServiceName',
      {
        path: {
          namespace: k8sNamespace,
          serviceName: fsName,
          apiVersion: 'v1',
          featureServiceName: 'test-feature-service',
        },
      },
      mockFeatureService({ name: 'test-feature-service' }),
    );

    cy.visit(
      `/featureStore/dataSets/${fsProjectName}/test_dataset?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getDataSetDetails');

    featureDataSetDetails.findSourceFeatureService().within(() => {
      cy.findByText('test-feature-service').click();
    });

    cy.url().should(
      'include',
      '/featureStore/featureServices/credit_scoring_local/test-feature-service',
    );
    featureServiceDetails.shouldHaveTitle('test-feature-service');
  });

  it('should navigate to feature details when clicking feature link in features table', () => {
    mockDataSetDetailsIntercept();
    mockFeatureDetailsIntercept();

    cy.visit(
      `/featureStore/dataSets/${fsProjectName}/test_dataset?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getDataSetDetails');

    featureDataSetDetails.findFeaturesTab().click();
    featureDataSetDetails.findFeaturesTabContent().should('be.visible');
    featureDataSetDetails.findFeaturesTable().should('be.visible');

    featureDataSetDetails.findFeaturesTable().within(() => {
      cy.contains('credit_card_due').click();
    });

    cy.url().should(
      'include',
      '/featureStore/features/credit_scoring_local/credit_history/credit_card_due',
    );

    featureDetails.shouldHaveApplicationsPageDescription('Credit card due amount');
    featureDetails.shouldHaveFeatureValueType('FLOAT');
    featureDetails.findFeatureTags().should('be.visible');
    featureDetails.findFeatureInteractiveExample().should('be.visible');
    featureDetails.findBreadcrumbLink().should('be.visible');
    featureDetails.findBreadcrumbItem().should('contain.text', 'credit_card_due');
  });
});
