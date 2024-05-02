import { mockProjectK8sResource, mockProjectsK8sList } from '~/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { createProjectModal, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { ProjectKind } from '~/k8sTypes';
import { incrementResourceVersion } from '~/__mocks__/mockUtils';
import {
  NotebookModel,
  PodModel,
  ProjectModel,
  ProjectRequestModel,
  RouteModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { mock200Status } from '~/__mocks__/mockK8sStatus';
import { mockNotebookK8sResource, mockRouteK8sResource } from '~/__mocks__';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import { asProjectAdminUser } from '~/__tests__/cypress/cypress/utils/users';
import { notebookConfirmModal } from '~/__tests__/cypress/cypress/pages/workbench';
import { testPagination } from '~/__tests__/cypress/cypress/utils/pagination';

const mockProject = mockProjectK8sResource({});
const initIntercepts = () => {
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProject]));
};

describe('Data science projects details', () => {
  it('should not have option to create new project', () => {
    asProjectAdminUser({ isSelfProvisioner: false });
    projectListPage.visit();
    projectListPage.shouldBeEmpty();
    projectListPage.findCreateProjectButton().should('not.exist');
  });

  it('should create project', () => {
    initCreateProjectIntercepts();

    projectListPage.visit();
    projectListPage.shouldBeEmpty();
    projectListPage.findCreateProjectButton().click();
    createProjectModal.shouldBeOpen();
    createProjectModal.findCancelButton().click();
    createProjectModal.shouldBeOpen(false);
    projectListPage.findCreateProjectButton().click();
    createProjectModal.shouldBeOpen();
    createProjectModal.findSubmitButton().should('be.disabled');

    createProjectModal.findNameInput().type('My Test Project');
    createProjectModal.findDescriptionInput().type('Test project description.');
    createProjectModal.findSubmitButton().should('be.enabled');
    createProjectModal.findResourceNameInput().should('have.value', 'my-test-project').clear();
    createProjectModal.findResourceNameInput().should('have.attr', 'aria-invalid', 'true');
    createProjectModal.findSubmitButton().should('be.disabled');
    createProjectModal.findResourceNameInput().type('test-project');

    createProjectModal.findSubmitButton().click();

    cy.wsK8s('ADDED', ProjectModel, mockProjectK8sResource({}));

    cy.url().should('include', '/projects/test-project');
  });

  it('should test url for workbench creation', () => {
    initIntercepts();
    projectListPage.visit();
    projectListPage.findCreateWorkbenchButton().click();

    cy.url().should('include', '/projects/test-project/spawner');
  });

  it('should list the new project', () => {
    initIntercepts();
    projectListPage.visit();
    projectListPage.shouldHaveProjects();
    const projectRow = projectListPage.getProjectRow('Test Project');
    projectRow.shouldHaveProjectIcon();
  });

  it('should delete project', () => {
    initIntercepts();
    projectListPage.visit();
    projectListPage.getProjectRow('Test Project').findKebabAction('Delete project').click();
    deleteModal.shouldBeOpen();
    deleteModal.findSubmitButton().should('be.disabled');
    deleteModal.findCancelButton().should('be.enabled').click();
    projectListPage.getProjectRow('Test Project').findKebabAction('Delete project').click();
    deleteModal.findInput().type('Test Project');

    cy.interceptK8s(
      'DELETE',
      {
        model: ProjectModel,
        name: 'test-project',
      },
      mock200Status({}),
    ).as('deleteProject');

    deleteModal.findSubmitButton().should('be.enabled').click();
    cy.wait('@deleteProject');

    cy.wsK8s('MODIFIED', ProjectModel, deletedMockProjectResource(mockProject));
    projectListPage.shouldBeEmpty();
  });

  it('validate pagination', () => {
    const totalItems = 50;
    const mockProjects: ProjectKind[] = Array.from({ length: totalItems }, (_, i) =>
      mockProjectK8sResource({
        k8sName: `ds-project-${i}`,
        displayName: `DS Project ${i}`,
        isDSProject: true,
      }),
    );
    mockProjectK8sResource({});
    cy.interceptK8sList(ProjectModel, mockK8sResourceList(mockProjects));
    projectListPage.visit();

    // top pagination
    testPagination({ totalItems, firstElement: 'DS Project 0', paginationVariant: 'top' });

    // bottom pagination
    testPagination({
      totalItems,
      firstElement: 'DS Project 0',
      paginationVariant: 'bottom',
    });
  });

  it('should react to updates through web sockets', () => {
    const projectsMock = mockProjectsK8sList();
    const projects = projectsMock.items;
    projectsMock.items = [projects[0]];
    const renamed = incrementResourceVersion(projects[1]);
    renamed.metadata.annotations = {
      ...projects[1].metadata.annotations,
      'openshift.io/display-name': 'renamed',
    };

    cy.interceptK8sList(ProjectModel, projectsMock);
    cy.visit('/projects');

    projectListPage.shouldHaveProjects();
    projectListPage.findProjectLink('DS Project 1').should('exist');

    cy.wsK8s('ADDED', ProjectModel, projects[1]);
    projectListPage.findProjectLink('DS Project 2').should('exist');

    cy.wsK8s('MODIFIED', ProjectModel, renamed);
    projectListPage.findProjectLink('renamed').should('exist');
    projectListPage.findProjectLink('DS Project 2').should('not.exist');

    cy.wsK8s('DELETED', ProjectModel, renamed);
    projectListPage.findProjectLink('DS Project 1').should('exist');
    projectListPage.findProjectLink('DS Project 2').should('not.exist');
    projectListPage.findProjectLink('renamed').should('not.exist');
  });

  describe('Table filter', () => {
    it('filter by name', () => {
      initIntercepts();
      projectListPage.visit();

      // Select the "Name" filter
      const projectListToolbar = projectListPage.getTableToolbar();
      projectListToolbar.findFilterMenuOption('filter-dropdown-select', 'Name').click();
      projectListToolbar.findSearchInput().type('Test Project');
      // Verify only rows with the typed run name exist
      projectListPage.getProjectRow('Test Project').find().should('exist');
    });

    it('filter by user', () => {
      initIntercepts();
      projectListPage.visit();

      // Select the "User" filter
      const projectListToolbar = projectListPage.getTableToolbar();
      projectListToolbar.findFilterMenuOption('filter-dropdown-select', 'User').click();
      projectListToolbar.findSearchInput().type('test-user');
      // Verify only rows with the typed run user exist
      projectListPage.getProjectRow('Test Project').find().should('exist');
    });
  });

  it('Validate that clicking on switch toggle will open modal to stop workbench', () => {
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('stopWorkbench');
    cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({})]));
    cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'test-notebook' })).as(
      'getWorkbench',
    );
    cy.interceptK8sList(
      { model: NotebookModel, ns: 'test-project' },
      mockK8sResourceList([
        mockNotebookK8sResource({
          opts: {
            spec: {
              template: {
                spec: {
                  containers: [
                    {
                      name: 'test-notebook',
                      image: 'test-image:latest',
                    },
                  ],
                },
              },
            },
            metadata: {
              name: 'test-notebook',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Test image',
              },
            },
          },
        }),
      ]),
    );
    projectListPage.visit();
    cy.wait('@getWorkbench');
    const projectTableRow = projectListPage.getProjectRow('Test Project');
    projectTableRow.findEnableSwitch().click();

    //stop workbench
    notebookConfirmModal.findStopWorkbenchButton().should('be.enabled');
    cy.interceptK8s(
      NotebookModel,
      mockNotebookK8sResource({
        opts: {
          metadata: {
            labels: {
              'opendatahub.io/notebook-image': 'true',
            },
            annotations: {
              'kubeflow-resource-stopped': '2023-02-14T21:45:14Z',
              'opendatahub.io/image-display-name': 'Test image',
            },
          },
        },
      }),
    );
    cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({ isRunning: false })]));

    notebookConfirmModal.findStopWorkbenchButton().click();
    cy.wait('@stopWorkbench').then((interception) => {
      expect(interception.request.body).to.containSubset([
        {
          op: 'add',
          path: '/metadata/annotations/kubeflow-resource-stopped',
        },
      ]);
    });
    projectTableRow.findNotebookStatusText().should('have.text', 'Stopped ');
    projectTableRow.findNotebookRouteLink().should('have.attr', 'aria-disabled', 'true');
  });
});

const deletedMockProjectResource = (resource: ProjectKind): ProjectKind =>
  incrementResourceVersion({
    ...resource,
    metadata: {
      ...resource.metadata,
      deletionTimestamp: '2023-02-15T21:43:59Z',
    },
    status: {
      phase: 'Terminating',
    },
  });

const initCreateProjectIntercepts = () => {
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([]));

  cy.interceptK8s('POST', ProjectRequestModel, mockProjectK8sResource({})).as(
    'createProjectRequest',
  );

  cy.interceptOdh(
    'GET /api/namespaces/:namespace/:context',
    { path: { namespace: 'test-project', context: '0' } },
    { applied: true },
  );
};
