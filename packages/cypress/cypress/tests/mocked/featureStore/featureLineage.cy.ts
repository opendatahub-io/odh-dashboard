/* eslint-disable camelcase */

import { mockFeatureStoreService } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreService';
import { mockFeatureStoreProject } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreProject';
import { mockEntity } from '@odh-dashboard/feature-store/mocks/mockEntities';
import { mockDataSource } from '@odh-dashboard/feature-store/mocks/mockDataSources';
import { mockFeatureView } from '@odh-dashboard/feature-store/mocks/mockFeatureViews';
import { mockFeatureService } from '@odh-dashboard/feature-store/mocks/mockFeatureServices';
import type {
  FeatureStoreLineage,
  FeatureViewLineage,
} from '@odh-dashboard/feature-store/types/lineage';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { DataScienceStackComponent } from '@odh-dashboard/k8s-core';
import { ProjectModel, ServiceModel } from '../../../utils/models';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import { featureStoreGlobal } from '../../../pages/featureStore/featureStoreGlobal';
import { featureLineage } from '../../../pages/featureStore/featureLineage';

const k8sNamespace = 'default';
const fsName = 'demo';
const fsProjectName = 'rbac';
const alternateProjectName = 'new-project';

const ENTITY_NAME = 'driver';
const DISCONNECTED_ENTITY_NAME = 'passenger';
const DATA_SOURCE_NAME = 'driver_source';
const FEATURE_VIEW_NAME = 'driver_stats';
const FEATURE_SERVICE_NAME = 'driver_activity';

const paginationInfo = {
  totalCount: 1,
  totalPages: 1,
};

const emptyPagination = {
  totalCount: 0,
  totalPages: 0,
};

const buildRelationship = (
  sourceType: string,
  sourceName: string,
  targetType: string,
  targetName: string,
) => ({
  source: { type: sourceType, name: sourceName },
  target: { type: targetType, name: targetName },
});

const initCommonIntercepts = () => {
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
        mockFeatureStoreProject({ spec: { name: alternateProjectName } }),
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

const buildStoreLineageMock = (
  project: string,
  includeDisconnectedEntity = false,
): FeatureStoreLineage => {
  const driverEntity = mockEntity({
    spec: {
      name: ENTITY_NAME,
      valueType: 'INT64',
      joinKey: 'driver_id',
      description: 'Driver entity',
    },
  });

  const entities = includeDisconnectedEntity
    ? [
        driverEntity,
        mockEntity({
          spec: {
            name: DISCONNECTED_ENTITY_NAME,
            valueType: 'INT64',
            joinKey: 'passenger_id',
            description: 'Unconnected entity for filter tests',
          },
        }),
      ]
    : [driverEntity];

  const featureView = mockFeatureView({
    spec: {
      ...mockFeatureView().spec,
      name: FEATURE_VIEW_NAME,
      entities: [ENTITY_NAME],
    },
  });

  return {
    project,
    objects: {
      entities,
      dataSources: [
        mockDataSource({
          name: DATA_SOURCE_NAME,
          description: 'Driver batch data source',
        }),
      ],
      featureViews: [
        {
          featureView: {
            spec: featureView.spec,
            meta: featureView.meta,
          },
        },
      ],
      featureServices: [mockFeatureService({ name: FEATURE_SERVICE_NAME })],
      features: [],
    },
    relationships: [
      buildRelationship('entity', ENTITY_NAME, 'featureView', FEATURE_VIEW_NAME),
      buildRelationship('dataSource', DATA_SOURCE_NAME, 'featureView', FEATURE_VIEW_NAME),
      buildRelationship('featureView', FEATURE_VIEW_NAME, 'featureService', FEATURE_SERVICE_NAME),
    ],
    indirectRelationships: [],
    pagination: {
      entities: paginationInfo,
      dataSources: paginationInfo,
      featureViews: paginationInfo,
      featureServices: paginationInfo,
      features: emptyPagination,
      relationships: { totalCount: 3, totalPages: 1 },
      indirectRelationships: emptyPagination,
    },
  };
};

const buildEmptyStoreLineageMock = (project: string): FeatureStoreLineage => ({
  project,
  objects: {
    entities: [],
    dataSources: [],
    featureViews: [],
    featureServices: [],
    features: [],
  },
  relationships: [],
  indirectRelationships: [],
  pagination: {
    entities: emptyPagination,
    dataSources: emptyPagination,
    featureViews: emptyPagination,
    featureServices: emptyPagination,
    features: emptyPagination,
    relationships: emptyPagination,
    indirectRelationships: emptyPagination,
  },
});

const buildFeatureViewLineageMock = (): FeatureViewLineage => ({
  relationships: [
    buildRelationship('entity', ENTITY_NAME, 'featureView', FEATURE_VIEW_NAME),
    buildRelationship('dataSource', DATA_SOURCE_NAME, 'featureView', FEATURE_VIEW_NAME),
    buildRelationship('feature', 'conv_rate', 'featureView', FEATURE_VIEW_NAME),
    buildRelationship('featureView', FEATURE_VIEW_NAME, 'featureService', FEATURE_SERVICE_NAME),
  ],
  pagination: { totalCount: 4, totalPages: 1 },
});

const mockLineageCompleteIntercept = (project: string, body: FeatureStoreLineage) => {
  cy.interceptOdh(
    'GET /api/featurestores/:namespace/:projectName/api/:apiVersion/lineage/complete',
    {
      path: { namespace: k8sNamespace, projectName: fsName, apiVersion: 'v1' },
      query: { project },
    },
    body,
  ).as('getLineageComplete');
};

const mockFeatureViewLineageIntercept = (
  project: string,
  featureViewName: string,
  body: FeatureViewLineage,
) => {
  cy.interceptOdh(
    'GET /api/featurestores/:namespace/:projectName/api/:apiVersion/lineage/objects/featureView/:featureViewName',
    {
      path: {
        namespace: k8sNamespace,
        projectName: fsName,
        apiVersion: 'v1',
        featureViewName,
      },
      query: { project },
    },
    body,
  ).as('getFeatureViewLineage');
};

const mockFeatureViewDetailsIntercept = () => {
  cy.intercept(
    'GET',
    `**/api/featurestores/${k8sNamespace}/${fsName}/api/v1/feature_views/${FEATURE_VIEW_NAME}?project=${fsProjectName}&include_relationships=true*`,
    mockFeatureView({
      spec: {
        ...mockFeatureView().spec,
        name: FEATURE_VIEW_NAME,
        entities: [ENTITY_NAME],
      },
    }),
  ).as('getFeatureViewDetails');
};

const openOverviewLineage = (project = fsProjectName) => {
  featureStoreGlobal.visitOverview(project);
  featureLineage.openOverviewLineageTab();
  cy.wait('@getLineageComplete');
  featureLineage.waitForLineageLoaded();
};

describe('Feature Store Lineage', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
  });

  it('should render project-wide lineage graph on overview Lineage tab', () => {
    mockLineageCompleteIntercept(fsProjectName, buildStoreLineageMock(fsProjectName));

    openOverviewLineage();

    featureLineage.findLineageGraphSurface().should('exist');
    featureLineage.shouldNodeLabelExist(ENTITY_NAME);
    featureLineage.shouldNodeLabelExist(DATA_SOURCE_NAME);
    featureLineage.shouldNodeLabelExist(FEATURE_VIEW_NAME);
    featureLineage.shouldNodeLabelExist(FEATURE_SERVICE_NAME);
    featureLineage.findLineageToolbar().should('be.visible');
  });

  it('should render scoped lineage graph on feature view detail Lineage tab', () => {
    mockFeatureViewDetailsIntercept();
    mockFeatureViewLineageIntercept(
      fsProjectName,
      FEATURE_VIEW_NAME,
      buildFeatureViewLineageMock(),
    );

    featureLineage.visitFeatureViewDetails(fsProjectName, FEATURE_VIEW_NAME);
    featureLineage.openFeatureViewLineageTab();
    cy.wait('@getFeatureViewLineage');
    featureLineage.waitForLineageLoaded();

    featureLineage.findFeatureViewLineageSection().should('be.visible');
    featureLineage.findLineageGraphSurface().should('exist');
    featureLineage.shouldNodeLabelExist(FEATURE_VIEW_NAME);
    featureLineage.shouldNodeLabelExist(FEATURE_SERVICE_NAME);
  });

  it('should show popover with object details and navigate from node interaction', () => {
    mockLineageCompleteIntercept(fsProjectName, buildStoreLineageMock(fsProjectName));

    openOverviewLineage();

    featureLineage.clickNodeByLabel(ENTITY_NAME);
    featureLineage.shouldShowPopoverWithName(ENTITY_NAME);

    featureLineage.findViewDetailsPageLink('Entity details').click();
    cy.url().should(
      'include',
      `/develop-train/feature-store/entities/${fsProjectName}/${ENTITY_NAME}`,
    );
  });

  it('should update graph when toolbar entity filter is applied', () => {
    mockLineageCompleteIntercept(fsProjectName, buildStoreLineageMock(fsProjectName, true));

    openOverviewLineage();

    featureLineage.shouldNodeLabelExist(DISCONNECTED_ENTITY_NAME);

    featureLineage.applyEntityFilter(ENTITY_NAME);

    featureLineage.shouldNodeLabelExist(ENTITY_NAME);
    featureLineage.shouldNodeLabelNotExist(DISCONNECTED_ENTITY_NAME);
  });

  it('should reload lineage graph when project is switched on overview Lineage tab', () => {
    mockLineageCompleteIntercept(fsProjectName, buildStoreLineageMock(fsProjectName));

    openOverviewLineage();
    featureLineage.shouldNodeLabelExist(FEATURE_VIEW_NAME);

    mockLineageCompleteIntercept(
      alternateProjectName,
      buildEmptyStoreLineageMock(alternateProjectName),
    );

    featureStoreGlobal.selectProject(alternateProjectName);
    cy.wait('@getLineageComplete');
    featureLineage.waitForLineageLoaded();

    featureStoreGlobal.findProjectSelector().should('contain.text', alternateProjectName);
    featureLineage.shouldShowEmptyLineageGraph();
    featureLineage.shouldNodeLabelNotExist(FEATURE_VIEW_NAME);
  });

  it('should handle empty lineage response', () => {
    mockLineageCompleteIntercept(fsProjectName, buildEmptyStoreLineageMock(fsProjectName));

    openOverviewLineage();

    featureLineage.shouldShowEmptyLineageGraph();
    featureLineage.shouldNodeLabelNotExist(FEATURE_VIEW_NAME);
    featureLineage.shouldNodeLabelNotExist(FEATURE_SERVICE_NAME);
  });

  it('should handle API error on lineage endpoint', () => {
    cy.intercept(
      'GET',
      `/api/featurestores/${k8sNamespace}/${fsName}/api/v1/lineage/complete?project=${fsProjectName}*`,
      {
        statusCode: 500,
        body: { detail: 'Internal server error' },
      },
    ).as('getLineageCompleteError');

    featureStoreGlobal.visitOverview(fsProjectName);
    featureLineage.openOverviewLineageTab();
    cy.wait('@getLineageCompleteError');

    featureLineage.shouldShowLineageError();
  });
});
