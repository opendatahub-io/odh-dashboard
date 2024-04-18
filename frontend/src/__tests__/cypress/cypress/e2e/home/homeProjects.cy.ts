import { initHomeIntercepts } from '~/__tests__/cypress/cypress/e2e/home/homeUtils';
import { mockSelfSubjectAccessReview } from '~/__mocks__/mockSelfSubjectAccessReview';
import { createProjectModal } from '~/__tests__/cypress/cypress/pages/projects';
import { SelfSubjectAccessReviewModel } from '~/__tests__/cypress/cypress/utils/models';

const interceptAccessReview = (allowed: boolean) => {
  cy.interceptK8s(
    'POST',
    SelfSubjectAccessReviewModel,
    mockSelfSubjectAccessReview({ allowed }),
  ).as('selfSubjectAccessReviewsCall');
};

describe('Home page Projects section', () => {
  it('should hide the projects section when disabled', () => {
    initHomeIntercepts({ disableHome: false, disableProjects: true });
    cy.visit('/');

    cy.findByTestId('landing-page-projects').should('not.exist');
  });
  it('should show the empty state w/ create button when privileged', () => {
    initHomeIntercepts({ disableHome: false });
    cy.visit('/');

    cy.findByTestId('landing-page-projects-empty').should('be.visible');
  });
  it('should show allow project creation from the empty state when privileged', () => {
    initHomeIntercepts({ disableHome: false });
    cy.visit('/');

    cy.findByTestId('landing-page-projects-empty').should('be.visible');
    cy.findByTestId('create-project-button').click();
    createProjectModal.shouldBeOpen();
    createProjectModal.findCancelButton().click();
    createProjectModal.shouldBeOpen(false);
  });
  it('should show not allow project creation from the empty state when not privileged', () => {
    initHomeIntercepts({ disableHome: false });
    interceptAccessReview(false);
    cy.visit('/');

    cy.findByTestId('landing-page-projects-empty').should('be.visible');
    cy.findByTestId('create-project-button').should('not.exist');
  });
});
