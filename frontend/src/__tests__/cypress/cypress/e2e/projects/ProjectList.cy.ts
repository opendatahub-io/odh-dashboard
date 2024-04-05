import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockStatus } from '~/__mocks__/mockStatus';
import { mockProjectK8sResource, mockProjectsK8sList } from '~/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { createProjectModal, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { ProjectKind } from '~/k8sTypes';
import { incrementResourceVersion } from '~/__mocks__/mockUtils';
import { ProjectModel } from '~/__tests__/cypress/cypress/utils/models';

describe('Data science projects details', () => {
  it('should start with an empty project list', () => {
    initIntercepts();
    cy.visit('/projects');
    projectListPage.shouldBeEmpty();
  });

  it('should open a modal to create a project', () => {
    initIntercepts();
    cy.visit('/projects');
    projectListPage.findCreateProjectButton().click();
    createProjectModal.shouldBeOpen();
    createProjectModal.findCancelButton().click();
    createProjectModal.shouldBeOpen(false);
    projectListPage.findCreateProjectButton().click();
    createProjectModal.shouldBeOpen();
    createProjectModal.findSubmitButton().should('be.disabled');
  });

  it('should create project', () => {
    initIntercepts();
    initCreateProjectIntercepts();

    projectListPage.visit();
    projectListPage.findCreateProjectButton().click();
    createProjectModal.findNameInput().type('My Test Project');
    createProjectModal.findDescriptionInput().type('Test project description.');
    createProjectModal.findSubmitButton().should('be.enabled');
    createProjectModal.findResourceNameInput().should('have.value', 'my-test-project').clear();
    createProjectModal.findResourceNameInput().should('have.attr', 'aria-invalid', 'true');
    createProjectModal.findSubmitButton().should('be.disabled');
    createProjectModal.findResourceNameInput().type('test-project');

    createProjectModal.findSubmitButton().click();

    cy.wsK8sAdded(ProjectModel, mockProjectK8sResource({}));

    cy.url().should('include', '/projects/test-project');
  });

  it('should list the new project', () => {
    initIntercepts();
    cy.intercept(
      {
        method: 'GET',
        pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
      },
      mockK8sResourceList([mockProjectK8sResource({})]),
    );
    projectListPage.visit();
    projectListPage.shouldHaveProjects();
    const projectRow = projectListPage.getProjectRow('Test Project');
    projectRow.shouldHaveProjectIcon();
  });

  it('should delete project', () => {
    initIntercepts();
    const mockProject = mockProjectK8sResource({});
    cy.intercept(
      {
        method: 'GET',
        pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
      },
      mockK8sResourceList([mockProject]),
    );

    projectListPage.visit();
    projectListPage.getProjectRow('Test Project').findKebabAction('Delete project').click();
    deleteModal.shouldBeOpen();
    deleteModal.findSubmitButton().should('be.disabled');
    deleteModal.findCancelButton().should('be.enabled').click();
    projectListPage.getProjectRow('Test Project').findKebabAction('Delete project').click();
    deleteModal.findInput().type('Test Project');

    cy.intercept(
      {
        method: 'DELETE',
        pathname: '/api/k8s/apis/project.openshift.io/v1/projects/test-project',
      },
      { kind: 'Status', apiVersion: 'v1', metadata: {}, status: 'Success' },
    ).as('deleteProject');

    deleteModal.findSubmitButton().should('be.enabled').click();
    cy.wait('@deleteProject');

    cy.wsK8sModified(ProjectModel, deletedMockProjectResource(mockProject));
    projectListPage.shouldBeEmpty();
  });

  it('should react to updates through web sockets', () => {
    initIntercepts();

    const projectsMock = mockProjectsK8sList();
    const projects = projectsMock.items;
    projectsMock.items = [projects[0]];
    const renamed = incrementResourceVersion(projects[1]);
    renamed.metadata.annotations = {
      ...projects[1].metadata.annotations,
      'openshift.io/display-name': 'renamed',
    };

    cy.intercept({ pathname: '/api/k8s/apis/project.openshift.io/v1/projects' }, projectsMock);
    cy.visit('/projects');

    projectListPage.shouldHaveProjects();
    projectListPage.findProjectLink('DS Project 1').should('exist');

    cy.wsK8sAdded(ProjectModel, projects[1]);
    projectListPage.findProjectLink('DS Project 2').should('exist');

    cy.wsK8sModified(ProjectModel, renamed);
    projectListPage.findProjectLink('renamed').should('exist');
    projectListPage.findProjectLink('DS Project 2').should('not.exist');

    cy.wsK8sDeleted(ProjectModel, renamed);
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

const initIntercepts = () => {
  cy.intercept('/api/config', mockDashboardConfig({}));
  cy.intercept('/api/status', mockStatus());
};

const initCreateProjectIntercepts = () => {
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
    },
    mockK8sResourceList([]),
  );

  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/k8s/apis/project.openshift.io/v1/projectrequests',
    },
    mockProjectK8sResource({}),
  ).as('createProjectRequest');

  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/namespaces/test-project/0',
    },
    { applied: true },
  );
};
