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
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { featureStoreGlobal } from '../../../pages/featureStore/featureStoreGlobal';
import { ProjectModel, ServiceModel } from '../../../utils/models';
import { asClusterAdminUser } from '../../../utils/mockUsers';

const k8sNamespace = 'default';
const fsName = 'demo';
const fsProjectName = 'credit_scoring_local';
const authorizedProject = 'my-ds-project';
const workbenchName = 'feast-workbench';

const noConnectedWorkbenchesResponse = [
  {
    feastProjectName: fsProjectName,
    namespace: k8sNamespace,
    permissionLevel: ['read'],
    connectedWorkbenches: [] as Array<{
      workbenchName: string;
      workbenchNamespace: string;
      projectName: string;
    }>,
  },
];

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
  }).as('getConnectedWorkbenches');
};

const openConnectedWorkbenchesModalAndWait = () => {
  featureStoreGlobal.openConnectedWorkbenchesModal();
  cy.wait('@getConnectedWorkbenches');
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
    interceptConnectedWorkbenches(noConnectedWorkbenchesResponse);

    featureStoreGlobal.visitOverview(fsProjectName);
    openConnectedWorkbenchesModalAndWait();
    cy.findByText(
      'View workbenches connected to the selected feature store. Rows with no workbench name represent authorized projects that do not yet contain a connected workbench.',
    ).should('be.visible');
  });

  it('should pre-select the active feast project and show a no-workbench row', () => {
    interceptConnectedWorkbenches(noConnectedWorkbenchesResponse);

    featureStoreGlobal.visitEntities(fsProjectName);
    openConnectedWorkbenchesModalAndWait();
    featureStoreGlobal
      .findConnectedWorkbenchesModalProjectSelector()
      .should('contain.text', fsProjectName);
    featureStoreGlobal.findConnectedWorkbenchesEmptyState().should('not.exist');
    featureStoreGlobal.findConnectedWorkbenchNone().should('be.visible');
    featureStoreGlobal.findConnectedWorkbenchNone().trigger('mouseenter');
    cy.findByText(
      'Go to the Authorized project page, edit a workbench or create a new one to connect with desired feature stores.',
    ).should('be.visible');
    cy.findByRole('link', { name: k8sNamespace }).should('be.visible');
    cy.findByText('read').should('be.visible');
  });

  it('should show an empty state when no feature stores are returned', () => {
    interceptConnectedWorkbenches([]);

    featureStoreGlobal.visitEntities(fsProjectName);
    openConnectedWorkbenchesModalAndWait();
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
    openConnectedWorkbenchesModalAndWait();

    featureStoreGlobal.findConnectedWorkbenchesTable().should('be.visible');
    cy.findByRole('link', { name: workbenchName }).should(
      'have.attr',
      'href',
      `/notebook/${authorizedProject}/${workbenchName}`,
    );
    cy.findByRole('link', { name: authorizedProject }).should('be.visible');
    cy.findByText('read').should('be.visible');
    cy.findByText('write').should('be.visible');
  });

  it('should show an error alert when the API request fails', () => {
    cy.intercept('GET', '/api/featurestores/projects-with-workbenches', {
      statusCode: 500,
      body: { error: 'Failed to fetch projects with connected workbenches' },
    }).as('getConnectedWorkbenches');

    featureStoreGlobal.visitEntities(fsProjectName);
    openConnectedWorkbenchesModalAndWait();
    cy.findByText('Failed to load connected workbenches').should('be.visible');
  });

  it('should close the modal when the close button is clicked', () => {
    interceptConnectedWorkbenches(noConnectedWorkbenchesResponse);

    featureStoreGlobal.visitEntities(fsProjectName);
    openConnectedWorkbenchesModalAndWait();
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

  describe('filter toolbar', () => {
    const multiProjectResponse = [
      {
        feastProjectName: fsProjectName,
        namespace: k8sNamespace,
        permissionLevel: ['Read', 'Write'],
        connectedWorkbenches: [
          {
            workbenchName: 'wb-alpha',
            workbenchNamespace: 'proj-a',
            projectName: 'proj-a',
          },
          {
            workbenchName: 'wb-beta',
            workbenchNamespace: 'proj-b',
            projectName: 'proj-b',
          },
        ],
      },
      {
        feastProjectName: 'second_project',
        namespace: k8sNamespace,
        permissionLevel: ['Delete'],
        connectedWorkbenches: [] as Array<{
          workbenchName: string;
          workbenchNamespace: string;
          projectName: string;
        }>,
      },
    ];

    const openModalWithMultiProjectData = () => {
      interceptConnectedWorkbenches(multiProjectResponse);
      featureStoreGlobal.visitEntities(fsProjectName);
      openConnectedWorkbenchesModalAndWait();
      featureStoreGlobal.findConnectedWorkbenchesModalProjectSelector().click();
      cy.findByRole('menuitem', { name: 'All feature stores' }).click();
    };

    it('should switch filter types and filter by workbench name', () => {
      openModalWithMultiProjectData();

      featureStoreGlobal.findFilterTypeToggle().should('have.text', 'Authorized project');
      featureStoreGlobal.findFilterTypeToggle().click();
      featureStoreGlobal.findFilterTypeOption('workbenchName').should('be.visible').click();
      featureStoreGlobal.findFilterTypeToggle().should('have.text', 'Workbench name');

      featureStoreGlobal.findWorkbenchNameFilterInput().type('alpha');
      featureStoreGlobal
        .findConnectedWorkbenchesTable()
        .find('tbody')
        .findAllByRole('row')
        .should('have.length', 1)
        .first()
        .should('contain.text', 'wb-alpha');
    });

    it('should filter by authorized project and show grouped options', () => {
      openModalWithMultiProjectData();

      featureStoreGlobal.findProjectFilterToggle().click();
      featureStoreGlobal.findProjectGroupHeader('with').should('be.visible');
      featureStoreGlobal.findProjectGroupHeader('without').should('be.visible');

      featureStoreGlobal.findProjectOption('proj-a').should('be.visible').click();
      featureStoreGlobal
        .findConnectedWorkbenchesTable()
        .find('tbody')
        .findAllByRole('row')
        .should('have.length', 1)
        .first()
        .should('contain.text', 'wb-alpha');
    });

    it('should filter by permission', () => {
      openModalWithMultiProjectData();

      featureStoreGlobal.findFilterTypeToggle().click();
      featureStoreGlobal.findFilterTypeOption('permission').should('be.visible').click();
      featureStoreGlobal.findPermissionFilterToggle().click();
      featureStoreGlobal.findPermissionOption('Delete').should('be.visible').click();

      featureStoreGlobal
        .findConnectedWorkbenchesTable()
        .find('tbody')
        .findAllByRole('row')
        .should('have.length', 1)
        .first()
        .should('contain.text', 'Delete');
    });

    it('should hide projects with connected workbenches using the toggle', () => {
      openModalWithMultiProjectData();

      featureStoreGlobal.findHideConnectedWorkbenchesSwitch().click();
      featureStoreGlobal
        .findConnectedWorkbenchesTable()
        .find('tbody')
        .findAllByRole('row')
        .should('have.length', 1)
        .first()
        .should('contain.text', k8sNamespace);
    });
  });
});
