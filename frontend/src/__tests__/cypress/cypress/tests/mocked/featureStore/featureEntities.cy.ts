/* eslint-disable camelcase */

import { mockFeatureStoreService } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreService';
import { mockFeatureStore } from '@odh-dashboard/feature-store/mocks/mockFeatureStore';
import { mockFeatureStoreProject } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreProject';
import { mockFeatureView } from '@odh-dashboard/feature-store/mocks/mockFeatureViews';
import { mockEntities, mockEntity } from '@odh-dashboard/feature-store/mocks/mockEntities';
import {
  mockComprehensiveSearchResponse,
  mockEmptySearchResponse,
} from '@odh-dashboard/feature-store/mocks/mockGlobalSearch';
import { featureStoreGlobal } from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal';
import { featureEntitiesTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureEntities';
import { featureEntityDetails } from '#~/__tests__/cypress/cypress/pages/featureStore/featureEntityDetails';
import { featureViewsTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureView';
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

const mockEntityFeatureViewsIntercept = () => {
  cy.intercept(
    'GET',
    `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/feature_views?project=${fsProjectName}&entity=user_id*`,
    {
      featureViews: [
        mockFeatureView({
          spec: {
            ...mockFeatureView().spec,
            name: 'zipcode_features',
            entities: ['user_id'],
          },
        }),
        mockFeatureView({
          spec: {
            ...mockFeatureView().spec,
            name: 'user_features',
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
        user_features: [
          {
            source: { type: 'feature', name: 'user_id' },
            target: { type: 'featureView', name: 'user_features' },
          },
          {
            source: { type: 'feature', name: 'user_age' },
            target: { type: 'featureView', name: 'user_features' },
          },
          {
            source: { type: 'feature', name: 'user_income' },
            target: { type: 'featureView', name: 'user_features' },
          },
        ],
      },
      pagination: {
        totalCount: 2,
        totalPages: 1,
      },
    },
  ).as('getEntityFeatureViews');
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
    featureEntitiesTable
      .findTable()
      .find('thead')
      .should('contain.text', 'Feature store repository');
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

    cy.visit(
      `/featureStore/entities/${fsProjectName}/nonexistent?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.findByText(`Entity nonexistent does not exist in project ${fsProjectName}`).should(
      'be.visible',
    );
  });

  it('should add tag to filter when clicking on a tag for the entity row', () => {
    featureStoreGlobal.visitEntities(fsProjectName);
    featureEntitiesTable.findTable().should('be.visible');

    featureEntitiesTable
      .findRow('transaction_id')
      .findTags()
      .within(() => {
        cy.contains('cardinality=high').click({ force: true });
      });

    featureEntitiesTable
      .findRow('transaction_id')
      .findTags()
      .within(() => {
        cy.contains('domain=transaction').click({ force: true });
      });

    featureEntitiesTable.shouldHaveEntityCount(1);
    featureEntitiesTable.findRow('transaction_id').findEntityName().should('be.visible');

    featureEntitiesTable.findToolbarClearFiltersButton().should('exist');
    featureEntitiesTable.findToolbarClearFiltersButton().click();
    featureEntitiesTable.shouldHaveEntityCount(2);
  });
});

describe('Entity Feature Views Tab', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockEntityDetailsIntercept();
    mockEntityFeatureViewsIntercept();
  });

  it('should display feature views for the entity', () => {
    cy.visit(
      `/featureStore/entities/${fsProjectName}/user_id?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getEntityDetails');

    featureEntityDetails.clickFeatureViewsTab();
    cy.wait('@getEntityFeatureViews');
    featureEntityDetails.findFeatureViewsTabContent().within(() => {
      featureViewsTable.findTable().should('be.visible');
      featureViewsTable.findRow('zipcode_features').shouldHaveFeatureViewName('zipcode_features');
    });
  });

  it('should display empty state when no feature views exist for entity', () => {
    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/feature_views?project=${fsProjectName}&entity=user_id*`,
      {
        featureViews: [],
        relationships: {},
        pagination: {
          totalCount: 0,
          totalPages: 0,
        },
      },
    ).as('getEmptyEntityFeatureViews');

    cy.visit(
      `/featureStore/entities/${fsProjectName}/user_id?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getEntityDetails');
    featureEntityDetails.clickFeatureViewsTab();
    cy.wait('@getEmptyEntityFeatureViews');
    featureEntityDetails.findFeatureViewsTabContent().within(() => {
      cy.findByText('No feature views found').should('be.visible');
      cy.findByText('No feature views are associated with this entity.').should('be.visible');
    });
  });

  it('should only call feature views API when tab is clicked', () => {
    cy.visit(
      `/featureStore/entities/${fsProjectName}/user_id?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getEntityDetails');

    cy.get('@getEntityFeatureViews.all').should('have.length', 0);
    featureEntityDetails.clickFeatureViewsTab();
    cy.wait('@getEntityFeatureViews');
    cy.get('@getEntityFeatureViews.all').should('have.length.at.least', 1);
    featureEntityDetails.findFeatureViewsTabContent().within(() => {
      featureViewsTable.findTable().should('be.visible');
    });
  });

  it('should navigate to feature view details when clicking on feature view name', () => {
    cy.visit(
      `/featureStore/entities/${fsProjectName}/user_id?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.wait('@getEntityDetails');
    featureEntityDetails.clickFeatureViewsTab();
    cy.wait('@getEntityFeatureViews');
    featureEntityDetails.findFeatureViewsTabContent().within(() => {
      featureViewsTable.findRow('zipcode_features').clickFeatureViewLink();
    });
    cy.url().should('include', `/featureStore/featureViews/${fsProjectName}/zipcode_features`);
  });
});

describe('Global Search in Feature Entities', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockAllEntitiesIntercept();
  });

  it('should display global search input on entities page', () => {
    featureStoreGlobal.visitEntities();

    featureStoreGlobal.findGlobalSearchContainer().should('be.visible');
    featureStoreGlobal.findGlobalSearchInput().should('be.visible');
    featureStoreGlobal
      .findGlobalSearchInput()
      .should('have.attr', 'placeholder', 'Search resources by name or description.');
  });

  it('should perform global search and display results', () => {
    const searchResponse = mockComprehensiveSearchResponse('user', fsProjectName);

    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/search*`,
      searchResponse,
    ).as('globalSearch');

    featureStoreGlobal.visitEntities();
    featureStoreGlobal.findGlobalSearchInput().clear().type('user');
    cy.wait('@globalSearch');

    featureStoreGlobal.findGlobalSearchMenu().should('be.visible');
    featureStoreGlobal.findGlobalSearchResultsCount().should('be.visible');
    featureStoreGlobal
      .findGlobalSearchResultsCount()
      .should('contain.text', `${searchResponse.results.length} result`);
    featureStoreGlobal.findGlobalSearchItem('entity', 'user_id').should('be.visible');
  });

  it('should navigate to correct detail page when clicking search result', () => {
    const searchResponse = mockComprehensiveSearchResponse('user', fsProjectName);

    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/search*`,
      searchResponse,
    ).as('globalSearch');

    mockEntityDetailsIntercept();
    featureStoreGlobal.visitEntities();

    featureStoreGlobal.findGlobalSearchInput().clear().type('user');
    cy.wait('@globalSearch');

    featureStoreGlobal.findGlobalSearchMenu().should('be.visible');
    featureStoreGlobal.findGlobalSearchResultsCount().should('be.visible');
    featureStoreGlobal.findGlobalSearchItem('entity', 'user_id').click();

    cy.url().should('include', `/featureStore/entities/${fsProjectName}/user_id`);
  });

  it('should display no results message for empty search', () => {
    const emptySearchResponse = mockEmptySearchResponse('nonexistent', fsProjectName);

    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/search*`,
      emptySearchResponse,
    ).as('emptyGlobalSearch');

    featureStoreGlobal.visitEntities();

    featureStoreGlobal.findGlobalSearchInput().clear().type('nonexistent');
    cy.wait('@emptyGlobalSearch');

    featureStoreGlobal.findGlobalSearchNoResults().should('be.visible');
    featureStoreGlobal
      .findGlobalSearchNoResultsText()
      .should('contain.text', 'No results found for query "nonexistent" from All repositories');
  });

  it('should show loading spinner during search', () => {
    cy.intercept('GET', `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/search*`, {
      delay: 1000,
      body: mockEmptySearchResponse('loading', fsProjectName),
    }).as('slowSearch');

    featureStoreGlobal.visitEntities();
    featureStoreGlobal.findGlobalSearchInput().clear().type('loading');
    featureStoreGlobal.findGlobalSearchLoadingSpinner().should('be.visible');

    cy.wait('@slowSearch');
    featureStoreGlobal.findGlobalSearchNoResults().should('be.visible');
  });

  it('should clear search when clear button is clicked', () => {
    const searchResponse = mockComprehensiveSearchResponse('user', fsProjectName);

    cy.intercept(
      'GET',
      `/api/service/featurestore/${k8sNamespace}/${fsName}/api/v1/search*`,
      searchResponse,
    ).as('globalSearch');

    featureStoreGlobal.visitEntities();

    featureStoreGlobal.findGlobalSearchInput().clear().type('user');
    cy.wait('@globalSearch');
    featureStoreGlobal.findGlobalSearchMenu().should('be.visible');
    featureStoreGlobal.findGlobalSearchResultsCount().should('be.visible');

    featureStoreGlobal.findGlobalSearchInput().clear();
    featureStoreGlobal.findGlobalSearchMenu().should('not.exist');
  });
});
