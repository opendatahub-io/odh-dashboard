import { mockProjectK8sResource, mockProjectsK8sList } from '#~/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { createProjectModal, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import type { ProjectKind } from '#~/k8sTypes';
import { incrementResourceVersion } from '#~/__mocks__/mockUtils';
import {
  NotebookModel,
  PodModel,
  ProjectModel,
  ProjectRequestModel,
  RouteModel,
  SelfSubjectAccessReviewModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { mock200Status } from '#~/__mocks__/mockK8sStatus';
import { mockDscStatus, mockNotebookK8sResource, mockRouteK8sResource } from '#~/__mocks__';
import { mockPodK8sResource } from '#~/__mocks__/mockPodK8sResource';
import { mockSelfSubjectAccessReview } from '#~/__mocks__/mockSelfSubjectAccessReview';
import { asProjectAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { notebookConfirmModal } from '#~/__tests__/cypress/cypress/pages/workbench';
import { testPagination } from '#~/__tests__/cypress/cypress/utils/pagination';

const mockProject = mockProjectK8sResource({ description: 'Mock description' });
const initIntercepts = () => {
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProject]));
};

describe('Projects details', () => {
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

    // Standard items pass
    createProjectModal.k8sNameDescription.findDisplayNameInput().type('My Test Project');
    createProjectModal.k8sNameDescription.findDescriptionInput().type('Test project description.');
    createProjectModal.findSubmitButton().should('be.enabled');
    // Really long display names pass
    createProjectModal.k8sNameDescription
      .findDisplayNameInput()
      .clear()
      .type(
        'This is a really long display name that will cause the Kubernetes name to exceed its max length and auto trim',
      );
    createProjectModal.findSubmitButton().should('be.enabled');
    createProjectModal.k8sNameDescription.findResourceEditLink().click();
    createProjectModal.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'false');
    createProjectModal.k8sNameDescription
      .findResourceNameInput()
      .should('have.value', 'this-is-a-really-long-display');
    // Invalid character k8s names fail
    createProjectModal.k8sNameDescription.findResourceNameInput().clear().type('InVaLiD vAlUe!');
    createProjectModal.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'true');
    createProjectModal.findSubmitButton().should('be.disabled');
    // Invalid length k8s names fail
    createProjectModal.k8sNameDescription
      .findResourceNameInput()
      .clear()
      .type('this-is-a-valid-character-string-but-it-is-too-long');
    createProjectModal.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'true');
    createProjectModal.findSubmitButton().should('be.disabled');
    // Valid k8s names succeed
    createProjectModal.k8sNameDescription.findResourceNameInput().clear().type('test-project');
    createProjectModal.findSubmitButton().click();
    cy.wsK8s('ADDED', ProjectModel, mockProjectK8sResource({}));

    cy.url().should('include', '/projects/test-project');
  });

  it('should list the new project', () => {
    initIntercepts();
    projectListPage.visit();
    projectListPage.shouldHaveProjects();
    const projectRow = projectListPage.getProjectRow('Test Project');
    projectRow.find().should('exist');
    projectRow.findDescription().should('contain.text', 'Mock description');
  });

  it('should delete project', () => {
    initIntercepts();
    projectListPage.visit();
    cy.interceptK8s(
      'POST',
      SelfSubjectAccessReviewModel,
      mockSelfSubjectAccessReview({ allowed: true }),
    ).as('selfSubjectAccessReviewsCall');
    const deleteProject = projectListPage
      .getProjectRow('Test Project')
      .findKebabAction('Delete project');
    cy.wait('@selfSubjectAccessReviewsCall');
    deleteProject.click();
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
    projectListPage.visit();

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

  it('should disable kebab actions with insufficient permissions', () => {
    initIntercepts();
    projectListPage.visit();
    cy.interceptK8s(
      'POST',
      SelfSubjectAccessReviewModel,
      mockSelfSubjectAccessReview({ allowed: false }),
    ).as('selfSubjectAccessReviewsCall');

    const editProject = projectListPage
      .getProjectRow('Test Project')
      .findKebabAction('Edit project');
    const editPermission = projectListPage
      .getProjectRow('Test Project')
      .findKebabAction('Edit permissions');
    const deleteProject = projectListPage
      .getProjectRow('Test Project')
      .findKebabAction('Delete project');
    cy.wait('@selfSubjectAccessReviewsCall');

    editProject.should('have.attr', 'aria-disabled', 'true');
    editPermission.should('have.attr', 'aria-disabled', 'true');
    deleteProject.should('have.attr', 'aria-disabled', 'true');
  });

  it('should filter by name', () => {
    initIntercepts();
    projectListPage.visit();

    // Select the "Name" filter
    const projectListToolbar = projectListPage.getTableToolbar();
    projectListToolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Name').click();
    projectListToolbar.findFilterInput('name').type('Test Project');
    // Verify only rows with the typed run name exist
    projectListPage.getProjectRow('Test Project').find().should('exist');
  });

  it('should filter by user', () => {
    initIntercepts();
    projectListPage.visit();

    // Select the "User" filter
    const projectListToolbar = projectListPage.getTableToolbar();
    projectListToolbar.findFilterMenuOption('filter-toolbar-dropdown', 'User').click();
    projectListToolbar.findFilterInput('user').type('test-user');
    // Verify only rows with the typed run user exist
    projectListPage.getProjectRow('Test Project').find().should('exist');
  });

  it('should show list of workbenches when the column is expanded', () => {
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
    cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'test-notebook' })).as(
      'getWorkbench',
    );
    cy.interceptK8sList(
      { model: NotebookModel },
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
              namespace: 'test-project',
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
    const projectTableRow = projectListPage.getProjectRow('Test Project');
    projectTableRow.findNotebookColumnExpander().click();
    const notebookRows = projectTableRow.getNotebookRows();
    notebookRows.should('have.length', 1);
  });

  it('should open the modal to stop workbench when user stops the workbench', () => {
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('stopWorkbench');
    cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({})]));
    cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'test-notebook' })).as(
      'getWorkbench',
    );
    cy.interceptK8sList(
      NotebookModel,
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
              namespace: 'test-project',
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
    const projectTableRow = projectListPage.getProjectRow('Test Project');
    projectTableRow.findNotebookColumnExpander().click();
    const notebookRows = projectTableRow.getNotebookRows();
    notebookRows.should('have.length', 1);

    const notebookRow = projectTableRow.getNotebookRow('Test Notebook');
    notebookRow.findNotebookRouteLink().should('not.have.attr', 'aria-disabled');

    notebookRow.findNotebookStop().click();

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
    notebookRow.findNotebookStatusText().should('have.text', 'Stopped');
    notebookRow.findNotebookRouteLink().should('have.attr', 'aria-disabled', 'true');
  });

  describe('Workbench disabled', () => {
    beforeEach(() => {
      cy.interceptOdh(
        'GET /api/dsc/status',
        mockDscStatus({
          installedComponents: {
            workbenches: false,
            'data-science-pipelines-operator': true,
            kserve: true,
            'model-mesh': true,
            'model-registry-operator': true,
          },
        }),
      );
      initIntercepts();
    });

    it('should hide workbench column when workbenches are disabled', () => {
      projectListPage.visit();

      // Verify workbench column is not present
      cy.get('th').contains('Workbenches').should('not.exist');

      // Verify workbench status indicators are not shown
      const projectTableRow = projectListPage.getProjectRow('Test Project');
      projectTableRow.findNotebookColumn().should('not.exist');
    });
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
