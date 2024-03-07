import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockStatus } from '~/__mocks__/mockStatus';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { createProjectModal, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';

describe('Data science projects details', () => {
  it('should start with an empty project list', () => {
    initIntercepts();
    cy.visitWithLogin('/projects');
    projectListPage.shouldBeEmpty();
  });

  it('should open a modal to create a project', () => {
    initIntercepts();
    cy.visitWithLogin('/projects');
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

    cy.intercept(
      {
        method: 'GET',
        pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
      },
      mockK8sResourceList([mockProjectK8sResource({})]),
    ).as('refreshProjectList');

    createProjectModal.findSubmitButton().click();

    cy.wait('@createProjectRequest').then((interception) => {
      expect(interception.request.body).to.eql({
        apiVersion: 'project.openshift.io/v1',
        kind: 'ProjectRequest',
        metadata: {
          name: 'test-project',
        },
        description: 'Test project description.',
        displayName: 'My Test Project',
      });
    });
    cy.wait('@refreshProjectList');
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
    projectListPage.findProjectRow('Test Project').should('exist');
    projectListPage.shouldHaveDSLabel('Test Project');
  });

  it('should delete project', () => {
    initIntercepts();
    cy.intercept(
      {
        method: 'GET',
        pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
      },
      mockK8sResourceList([mockProjectK8sResource({})]),
    );

    projectListPage.visit();
    projectListPage.findProjectRow('Test Project').findKebabAction('Delete project').click();
    deleteModal.shouldBeOpen();
    deleteModal.findSubmitButton().should('be.disabled');
    deleteModal.findCancelButton().should('be.enabled').click();
    projectListPage.findProjectRow('Test Project').findKebabAction('Delete project').click();
    deleteModal.findInput().type('Test Project');
    cy.intercept(
      {
        method: 'GET',
        pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
      },
      mockK8sResourceList([deletedMockProjectResource()]),
    ).as('refreshproject');
    cy.intercept(
      {
        method: 'DELETE',
        pathname: '/api/k8s/apis/project.openshift.io/v1/projects/test-project',
      },
      { kind: 'Status', apiVersion: 'v1', metadata: {}, status: 'Success' },
    ).as('deleteProject');

    deleteModal.findSubmitButton().should('be.enabled').click();
    cy.wait('@deleteProject');
    cy.wait('@refreshproject');

    projectListPage.shouldBeEmpty();
  });
});

const deletedMockProjectResource = () => {
  const deletedResource = mockProjectK8sResource({});
  //updating deleted time stamp
  deletedResource.metadata.deletionTimestamp = '2023-02-15T21:43:59Z';
  //updating status
  deletedResource.status = {
    phase: 'Terminating',
  };
  return deletedResource;
};

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
