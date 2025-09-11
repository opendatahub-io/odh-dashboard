import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { createProjectModal, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import { failEarly } from '#~/__tests__/cypress/cypress/utils/failEarly';

describe('Projects', { testIsolation: false }, () => {
  // tests run in sequence and should fail if the one before it fails
  failEarly();

  it('should start with an empty project list', () => {
    cy.interceptSnapshot('/api/builds', 'builds');
    cy.interceptSnapshot('/api/status', 'status');
    cy.interceptSnapshot('/api/config', 'config');
    cy.interceptSnapshot('/api/k8s/apis/project.openshift.io/v1/projects', 'projects');

    cy.visitWithLogin('/projects');

    cy.waitSnapshot('@builds');
    cy.waitSnapshot('@status');
    cy.waitSnapshot('@config');

    cy.waitSnapshot('@projects').then((interception) => {
      expect(interception.response?.body).property('items').to.have.lengthOf(0);
    });

    cy.waitSnapshot('@projects');

    projectListPage.shouldBeEmpty();
  });

  it('should open a modal to create a project', () => {
    projectListPage.findCreateProjectButton().click();
    createProjectModal.shouldBeOpen();
    createProjectModal.findCancelButton().click();
    createProjectModal.shouldBeOpen(false);
    projectListPage.findCreateProjectButton().click();
    createProjectModal.shouldBeOpen();
    createProjectModal.findSubmitButton().should('be.disabled');
  });

  it('should create project', () => {
    createProjectModal.k8sNameDescription.findDisplayNameInput().type('My Test Project');
    createProjectModal.k8sNameDescription.findDescriptionInput().type('Test project description.');
    createProjectModal.findSubmitButton().should('be.enabled');
    createProjectModal.k8sNameDescription.findResourceEditLink().click();
    createProjectModal.k8sNameDescription
      .findResourceNameInput()
      .should('have.value', 'my-test-project')
      .clear();
    createProjectModal.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'true');
    createProjectModal.findSubmitButton().should('be.disabled');
    createProjectModal.k8sNameDescription.findResourceNameInput().type('test-project');

    cy.interceptSnapshot('/api/k8s/apis/project.openshift.io/v1/projects', 'projects-1');
    cy.interceptSnapshot('/api/namespaces/test-project/0', 'update-project');
    cy.interceptSnapshot(
      '/api/k8s/apis/project.openshift.io/v1/projectrequests',
      'create-test-project',
      true,
    ).then((trigger) => {
      createProjectModal.findSubmitButton().should('be.enabled').click();
      createProjectModal
        .findSubmitButton()
        .should('be.disabled')
        // trigger the response only after asserting the update button state.
        .then(() => trigger());
    });

    cy.waitSnapshot('@create-test-project').then((interception) => {
      expect(interception.request.body).to.eql({
        apiVersion: 'project.openshift.io/v1',
        description: 'Test project description.',
        displayName: 'My Test Project',
        kind: 'ProjectRequest',
        metadata: {
          name: 'test-project',
        },
      });
    });
    cy.waitSnapshot('@update-project');
    cy.waitSnapshot('@projects-1');

    createProjectModal.find().should('not.exist');

    cy.url().should('include', '/projects/test-project');
  });

  it('should list the new project', () => {
    cy.interceptSnapshot('/api/k8s/apis/project.openshift.io/v1/projects', 'projects-1');
    // navigate back to project list page
    projectListPage.navigate();
    cy.waitSnapshot('@projects-1');
    projectListPage.shouldHaveProjects();
    projectListPage.getProjectRow('My Test Project').find().should('exist');

    cy.testA11y();
  });

  it('should delete project', () => {
    projectListPage.getProjectRow('My Test Project').findKebabAction('Delete project').click();

    deleteModal.shouldBeOpen();
    deleteModal.findSubmitButton().should('be.disabled');
    deleteModal.findCancelButton().should('be.enabled').click();

    projectListPage.getProjectRow('My Test Project').findKebabAction('Delete project').click();

    deleteModal.findInput().type('My Test Project');

    cy.interceptSnapshot('/api/k8s/apis/project.openshift.io/v1/projects', 'projects-0');
    cy.interceptSnapshot(
      '/api/k8s/apis/project.openshift.io/v1/projects/test-project',
      'delete-project',
      true,
    ).then((trigger) => {
      deleteModal.findSubmitButton().should('be.enabled').click();
      // spinner causes exact match to fail
      deleteModal
        .findSubmitButton()
        .should('be.disabled')
        // trigger the response only after asserting the update button state.
        .then(() => trigger());
    });

    cy.waitSnapshot('@delete-project').then((interception) => {
      expect(interception.request.method).to.equal('DELETE');
      expect(interception.response?.statusCode).to.equal(200);
    });
    cy.waitSnapshot('@projects-0').then((interception) => {
      const items = interception.response?.body.items.filter(
        (i: K8sResourceCommon) => !i.metadata?.deletionTimestamp,
      );
      expect(items).to.have.lengthOf(0);
    });

    projectListPage.shouldBeEmpty();
  });
});
