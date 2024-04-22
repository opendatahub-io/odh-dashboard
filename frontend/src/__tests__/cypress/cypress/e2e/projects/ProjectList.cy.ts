import { mockProjectK8sResource, mockProjectsK8sList } from '~/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { createProjectModal, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { ProjectKind } from '~/k8sTypes';
import { incrementResourceVersion } from '~/__mocks__/mockUtils';
import { ProjectModel, ProjectRequestModel } from '~/__tests__/cypress/cypress/utils/models';
import { mock200Status } from '~/__mocks__/mockK8sStatus';
import { asProjectAdminUser } from '~/__tests__/cypress/cypress/utils/users';

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

  it('should list the new project', () => {
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
    projectListPage.visit();
    projectListPage.shouldHaveProjects();
    const projectRow = projectListPage.getProjectRow('Test Project');
    projectRow.shouldHaveProjectIcon();
  });

  it('should delete project', () => {
    const mockProject = mockProjectK8sResource({});
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProject]));

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
