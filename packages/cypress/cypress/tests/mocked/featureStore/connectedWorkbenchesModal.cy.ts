/* eslint-disable camelcase */

import { mockFeatureStoreService } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreService';
import { mockFeatureStoreProject } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreProject';
import { mockEntities, mockEntity } from '@odh-dashboard/feature-store/mocks/mockEntities';
import {
  mockPopularTags,
  mockRecentlyVisited,
  mockResourceCounts,
} from '@odh-dashboard/feature-store/mocks/mockMetrics';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { featureStoreGlobal } from '../../../pages/featureStore/featureStoreGlobal';
import { ProjectModel, ServiceModel } from '../../../utils/models';
import { asClusterAdminUser } from '../../../utils/mockUsers';

const k8sNamespace = 'default';
const fsName = 'demo';
const fsProjectName = 'credit_scoring_local';
const authorizedProject = 'my-ds-project';
const workbenchName = 'feast-workbench';

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
      projects: [mockFeatureStoreProject({ spec: { name: fsProjectName } })],
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

const mockOverviewMetricsIntercepts = () => {
  cy.intercept(
    'GET',
    `/api/featurestores/${k8sNamespace}/${fsName}/api/v1/metrics/popular_tags?project=${fsProjectName}&limit=4*`,
    mockPopularTags(),
  );
  cy.intercept(
    'GET',
    `/api/featurestores/${k8sNamespace}/${fsName}/api/v1/metrics/recently_visited?project=${fsProjectName}*`,
    mockRecentlyVisited(),
  );
  cy.intercept(
    'GET',
    `/api/featurestores/${k8sNamespace}/${fsName}/api/v1/metrics/resource_counts?project=${fsProjectName}*`,
    mockResourceCounts(),
  );
};

const mockProjectEntitiesIntercept = () => {
  cy.intercept(
    'GET',
    `/api/featurestores/${k8sNamespace}/${fsName}/api/v1/entities?project=${fsProjectName}&include_relationships=true*`,
    mockEntities({
      entities: [mockEntity({ project: fsProjectName })],
    }),
  );
};

const interceptConnectedWorkbenches = (
  connectedWorkbenches: Array<{
    feastProjectName: string;
    namespace: string;
    permissionLevel: string[];
    connectedWorkbenches: Array<{
      workbenchName: string;
      workbenchNamespace: string;
      projectName: string;
    }>;
  }>,
) => {
  cy.interceptOdh('GET /api/featurestores/projects-with-workbenches', {
    connectedWorkbenches,
  });
};

describe('Connected Workbenches modal', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockProjectEntitiesIntercept();
  });

  it('should display an enabled link when the user has projects', () => {
    featureStoreGlobal.visitEntities(fsProjectName);
    featureStoreGlobal
      .findConnectedWorkbenchesLink()
      .should('be.visible')
      .and('have.text', 'View connected workbenches')
      .and('not.have.attr', 'aria-disabled', 'true');
  });

  it('should open the modal from the overview page link', () => {
    mockOverviewMetricsIntercepts();
    interceptConnectedWorkbenches([
      {
        feastProjectName: fsProjectName,
        namespace: k8sNamespace,
        permissionLevel: ['read'],
        connectedWorkbenches: [],
      },
    ]);

    featureStoreGlobal.visitOverview(fsProjectName);
    featureStoreGlobal.openConnectedWorkbenchesModal();
    cy.findByText(
      'View workbenches connected to the selected feature store. Rows with no workbench name represent authorized projects that do not yet contain a connected workbench.',
    ).should('be.visible');
  });

  it('should pre-select the active feast project in the modal dropdown', () => {
    interceptConnectedWorkbenches([
      {
        feastProjectName: fsProjectName,
        namespace: k8sNamespace,
        permissionLevel: ['read'],
        connectedWorkbenches: [],
      },
    ]);

    featureStoreGlobal.visitEntities(fsProjectName);
    featureStoreGlobal.openConnectedWorkbenchesModal();
    featureStoreGlobal
      .findConnectedWorkbenchesModalProjectSelector()
      .should('contain.text', fsProjectName);
  });

  it('should show an empty state when no authorized projects are returned', () => {
    interceptConnectedWorkbenches([
      {
        feastProjectName: fsProjectName,
        namespace: k8sNamespace,
        permissionLevel: ['read'],
        connectedWorkbenches: [],
      },
    ]);

    featureStoreGlobal.visitEntities(fsProjectName);
    featureStoreGlobal.openConnectedWorkbenchesModal();
    featureStoreGlobal.findConnectedWorkbenchesEmptyState().should('be.visible');
    cy.findByText('No authorized projects found').should('be.visible');
  });

  it('should render connected workbench rows in the table', () => {
    interceptConnectedWorkbenches([
      {
        feastProjectName: fsProjectName,
        namespace: k8sNamespace,
        permissionLevel: ['read', 'write'],
        connectedWorkbenches: [
          {
            workbenchName,
            workbenchNamespace: authorizedProject,
            projectName: authorizedProject,
          },
        ],
      },
    ]);

    featureStoreGlobal.visitEntities(fsProjectName);
    featureStoreGlobal.openConnectedWorkbenchesModal();

    cy.findByTestId('connected-workbenches-table').should('be.visible');
    cy.findByRole('link', { name: new RegExp(workbenchName) }).should('be.visible');
    cy.findByRole('link', { name: authorizedProject }).should('be.visible');
    cy.findByText('read').should('be.visible');
    cy.findByText('write').should('be.visible');
  });

  it('should show an error alert when the API request fails', () => {
    cy.interceptOdh('GET /api/featurestores/projects-with-workbenches', {
      statusCode: 500,
      body: { error: 'Failed to fetch projects with connected workbenches' },
    });

    featureStoreGlobal.visitEntities(fsProjectName);
    featureStoreGlobal.openConnectedWorkbenchesModal();
    cy.findByText('Failed to load connected workbenches').should('be.visible');
  });

  it('should close the modal when the close button is clicked', () => {
    interceptConnectedWorkbenches([
      {
        feastProjectName: fsProjectName,
        namespace: k8sNamespace,
        permissionLevel: ['read'],
        connectedWorkbenches: [],
      },
    ]);

    featureStoreGlobal.visitEntities(fsProjectName);
    featureStoreGlobal.openConnectedWorkbenchesModal();
    cy.findByRole('button', { name: /Close/i }).click();
    featureStoreGlobal.findConnectedWorkbenchesModal().should('not.exist');
  });

  it('should disable the link with a tooltip when the user has no projects', () => {
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([]));

    featureStoreGlobal.visitEntities(fsProjectName);
    featureStoreGlobal
      .findConnectedWorkbenchesLink()
      .should('have.attr', 'aria-disabled', 'true')
      .trigger('mouseenter');
    cy.findByText(
      'To create and connect workbenches, you must first have a project with access permission. Update project permissions.',
    ).should('be.visible');
  });
});
