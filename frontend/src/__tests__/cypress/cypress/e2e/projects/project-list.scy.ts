import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  createProjectModal,
  deleteProjectModal,
  projectListPage,
} from '~/__tests__/cypress/cypress/pages/projects';

import { failEarly } from '~/__tests__/cypress/cypress/utils/failEarly';

describe('Data Science Projects', { testIsolation: false }, () => {
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

    projectListPage.wait();
    projectListPage.shouldBeEmpty();

    cy.waitSnapshot('@projects');
  });

  it('should open a modal to create a project', () => {
    projectListPage.selectCreateProjectButton().click();
    createProjectModal.selectModal().should('exist');
    createProjectModal.selectCancelButton().click();
    createProjectModal.selectModal().should('not.exist');
    projectListPage.selectCreateProjectButton().click();
    createProjectModal.selectModal().should('exist');
    createProjectModal.selectSubmitButton().should('be.disabled');
  });

  it('should create project', () => {
    createProjectModal.selectNameInput().type('My Test Project');
    createProjectModal.selectDescriptionInput().type('Test project description.');
    createProjectModal.selectSubmitButton().should('be.enabled');
    createProjectModal.selectResourceNameInput().should('have.value', 'my-test-project').clear();
    createProjectModal.selectResourceNameInput().should('have.attr', 'aria-invalid', 'true');
    createProjectModal.selectSubmitButton().should('be.disabled');
    createProjectModal.selectResourceNameInput().type('test-project');

    cy.interceptSnapshot('/api/k8s/apis/project.openshift.io/v1/projects', 'projects-1');
    cy.interceptSnapshot('/api/namespaces/test-project/0', 'update-project');
    cy.interceptSnapshot(
      '/api/k8s/apis/project.openshift.io/v1/projectrequests',
      'create-test-project',
      true,
    ).then((trigger) => {
      createProjectModal.selectSubmitButton().should('be.enabled').click();
      createProjectModal
        .selectSubmitButton()
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

    createProjectModal.selectModal().should('not.exist');

    cy.url().should('include', '/projects/test-project');
  });

  it('should list the new project', () => {
    cy.interceptSnapshot('/api/k8s/apis/project.openshift.io/v1/projects', 'projects-1');
    // navigate back to project list page
    projectListPage.navigate();
    cy.waitSnapshot('@projects-1');
    projectListPage.shouldHaveProjects();
    projectListPage.selectProjectRow('My Test Project').should('exist');
  });

  it('should delete project', () => {
    projectListPage.selectProjectActions('My Test Project').click();
    projectListPage.selectDeleteAction().click();

    deleteProjectModal.selectModal().should('exist');

    deleteProjectModal.selectDeleteButton().should('be.disabled');
    deleteProjectModal.selectCancelButton().should('be.enabled').click();

    projectListPage.selectProjectActions('My Test Project').click();
    projectListPage.selectDeleteAction().click();

    deleteProjectModal.selectModal().should('exist');

    deleteProjectModal.selectInput().type('My Test Project');

    cy.interceptSnapshot('/api/k8s/apis/project.openshift.io/v1/projects', 'projects-0');
    cy.interceptSnapshot(
      '/api/k8s/apis/project.openshift.io/v1/projects/test-project',
      'delete-project',
      true,
    ).then((trigger) => {
      deleteProjectModal.selectDeleteButton().should('be.enabled').click();
      // spinner causes exact match to fail
      deleteProjectModal
        .selectDeleteButton()
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
