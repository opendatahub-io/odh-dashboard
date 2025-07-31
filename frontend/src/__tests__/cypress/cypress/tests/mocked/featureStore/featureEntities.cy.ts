/* eslint-disable camelcase */

import { featureStoreGlobal } from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal';
import { featureEntitiesTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureEntities';
import { featureEntityDetails } from '#~/__tests__/cypress/cypress/pages/featureStore/featureEntityDetails';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { ProjectModel, ServiceModel } from '#~/__tests__/cypress/cypress/utils/models';
import { asClusterAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockFeatureStoreService } from '#~/__mocks__/mockFeatureStoreService';
import { mockFeatureStore } from '#~/__mocks__/mockFeatureStore';
import { mockFeatureStoreProject } from '#~/__mocks__/mockFeatureStoreProject';
import { mockEntities, mockEntity } from '#~/__mocks__/mockEntities';

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

const mockAllEntitiesIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/entities/all?include_relationships=true*`,
    mockEntities({
      entities: [
        mockEntity({ project: fsProjectName }),
        mockEntity({ project: fsProjectName2 }),
        mockEntity({
          spec: {
            name: 'transaction_id',
            valueType: 'STRING',
            description: 'Unique identifier for each transaction',
            joinKey: 'transaction_id',
            tags: {
              join_key: 'true',
              cardinality: 'high',
              domain: 'transaction',
              pii: 'false',
            },
            owner: 'data-team@company.com',
          },
          project: fsProjectName2,
        }),
      ],
    }),
  ).as('getAllEntities');
};

const mockProjectEntitiesIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/entities?project=${fsProjectName}&include_relationships=true*`,
    mockEntities({
      entities: [
        mockEntity(),
        mockEntity({
          spec: {
            name: 'transaction_id',
            valueType: 'STRING',
            description: 'Unique identifier for each transaction',
            joinKey: 'transaction_id',
            tags: {
              join_key: 'true',
              cardinality: 'high',
              domain: 'transaction',
              pii: 'false',
            },
            owner: 'data-team@company.com',
          },
        }),
      ],
    }),
  ).as('getProjectEntities');
};

const mockEntityDetailsIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/entities/user_id?include_relationships=true&project=${fsProjectName}*`,
    mockEntity({
      spec: {
        name: 'user_id',
        valueType: 'STRING',
        description: 'Unique identifier for each user',
        joinKey: 'user_id',
        tags: {
          join_key: 'true',
          cardinality: 'high',
          domain: 'user',
          pii: 'false',
        },
        owner: 'data-team@company.com',
      },
      meta: {
        createdTimestamp: '2025-01-15T10:30:00.000000Z',
        lastUpdatedTimestamp: '2025-01-15T10:30:00.000000Z',
      },
      project: fsProjectName,
    }),
  ).as('getEntityDetails');
};

describe('Feature Entities for all projects', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockAllEntitiesIntercept();
  });

  it('should display all entities when no project is selected', () => {
    featureStoreGlobal.visitEntities();

    featureEntitiesTable.findTable().should('be.visible');
    featureEntitiesTable.shouldHaveEntityCount(3);
  });

  it('should display project column when viewing all projects', () => {
    featureStoreGlobal.visitEntities();
    featureEntitiesTable.findTable().should('be.visible');
    featureEntitiesTable.findTable().find('thead').should('contain.text', 'Project');
    featureEntitiesTable.findRow('user_id').shouldHaveProject(fsProjectName);
    featureEntitiesTable.findRow('transaction_id').shouldHaveProject(fsProjectName2);
  });

  it('should navigate to feature view when clicking feature views popover in all projects view', () => {
    featureStoreGlobal.visitEntities();

    featureEntitiesTable.findTable().should('be.visible');
    featureEntitiesTable.findRow('user_id').findFeatureViews().find('button').click();

    cy.findByRole('dialog').should('be.visible');
    cy.findByText('user_features').should('be.visible');
    cy.findByRole('dialog').findByText('user_features').click();
    cy.url().should('include', '/featureStore/featureViews/credit_scoring_local/user_features');
  });

  it('should navigate to entity details when clicking entity name in all projects view', () => {
    mockEntityDetailsIntercept();
    featureStoreGlobal.visitEntities();

    featureEntitiesTable.findTable().should('be.visible');
    featureEntitiesTable.findRow('user_id').findEntityLink().click();
    cy.url().should('include', '/featureStore/entities/credit_scoring_local');
    featureEntityDetails
      .shouldHaveApplicationsPageDescription('Unique identifier for each user')
      .shouldHaveValueType('STRING')
      .shouldHaveJoinKey('user_id');
    featureEntityDetails.findTags().should('be.visible');
    featureEntityDetails.findInteractiveExample().should('be.visible');
    featureEntityDetails.findBreadcrumbLink().should('be.visible');
    featureEntityDetails.findBreadcrumbItem().should('contain.text', 'user_id');
  });

  it('should navigate back to entities page when clicking breadcrumb link', () => {
    mockEntityDetailsIntercept();
    featureStoreGlobal.visitEntities();
    featureEntitiesTable.findTable().should('be.visible');
    featureEntitiesTable.findRow('user_id').findEntityLink().click();
    cy.url().should('include', '/featureStore/entities/credit_scoring_local');

    featureEntityDetails.findBreadcrumbLink().should('be.visible');
    featureEntityDetails.findBreadcrumbItem().should('contain.text', 'user_id');
    featureEntityDetails.findBreadcrumbLink().click();

    cy.url().should('include', '/featureStore/entities');
    featureStoreGlobal.findHeading().should('have.text', 'Entities');
    featureEntitiesTable.findTable().should('be.visible');
  });
});

describe('Feature Entities', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockProjectEntitiesIntercept();
  });

  it('should display feature entities page with correct title and content', () => {
    featureStoreGlobal.visitEntities(fsProjectName);
    featureStoreGlobal.findHeading().should('have.text', 'Entities');
    featureStoreGlobal.findProjectSelector().should('exist');
    featureStoreGlobal.findProjectSelector().click();
    featureStoreGlobal.findProjectSelectorDropdown().should('contain.text', fsProjectName);
  });

  it('should not display project column when viewing a single project', () => {
    featureStoreGlobal.visitEntities(fsProjectName);
    featureEntitiesTable.findTable().should('be.visible');

    featureEntitiesTable.findTable().find('thead').should('not.contain.text', 'Project');
    featureEntitiesTable.findTable().find('thead').should('not.contain.text', 'Projects');

    featureEntitiesTable
      .findRow('user_id')
      .shouldHaveEntityName('user_id')
      .shouldHaveValueType('STRING')
      .shouldHaveJoinKey('user_id')
      .shouldHaveOwner('data-team@company.com');

    featureEntitiesTable
      .findRow('transaction_id')
      .shouldHaveEntityName('transaction_id')
      .shouldHaveValueType('STRING')
      .shouldHaveJoinKey('transaction_id')
      .shouldHaveOwner('data-team@company.com');
  });

  it('should display entities table with data', () => {
    featureStoreGlobal.visitEntities(fsProjectName);
    featureEntitiesTable.findTable().should('be.visible');
    featureEntitiesTable.shouldHaveEntityCount(2);
    featureEntitiesTable
      .findRow('user_id')
      .shouldHaveEntityName('user_id')
      .shouldHaveValueType('STRING')
      .shouldHaveJoinKey('user_id')
      .shouldHaveOwner('data-team@company.com');
    featureEntitiesTable
      .findRow('transaction_id')
      .shouldHaveEntityName('transaction_id')
      .shouldHaveValueType('STRING')
      .shouldHaveJoinKey('transaction_id')
      .shouldHaveOwner('data-team@company.com');
  });

  it('should handle empty entities list', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/entities?project=${fsProjectName}&include_relationships=true*`,
      {
        entities: [],
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
    ).as('getEmptyProjectEntities');

    featureStoreGlobal.visitEntities(fsProjectName);
    featureEntitiesTable.shouldHaveEntityCount(0);
    featureEntitiesTable.findEmptyState().should('exist');
  });

  it('should navigate to feature view when clicking feature views popover', () => {
    featureStoreGlobal.visitEntities(fsProjectName);

    featureEntitiesTable.findTable().should('be.visible');

    featureEntitiesTable.findRow('user_id').findFeatureViews().find('button').click();
    cy.findByRole('dialog').should('be.visible');
    cy.findByText('user_features').should('be.visible');
    cy.findByRole('dialog').findByText('user_features').click();
    cy.url().should('include', '/featureStore/featureViews/credit_scoring_local/user_features');
  });

  it('should handle entity not found with proper error message', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/entities/nonexistent?include_relationships=true&project=${fsProjectName}*`,
      {
        statusCode: 404,
        body: { detail: `Entity nonexistent does not exist in project ${fsProjectName}` },
      },
    ).as('getEntityNotFound');

    cy.visit(`/featureStore/entities/${fsProjectName}/nonexistent`);
    cy.findByText(`Entity nonexistent does not exist in project ${fsProjectName}`).should(
      'be.visible',
    );
  });
});
