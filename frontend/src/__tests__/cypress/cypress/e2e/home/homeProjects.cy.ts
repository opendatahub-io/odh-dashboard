import { mockSelfSubjectAccessReview } from '~/__mocks__/mockSelfSubjectAccessReview';
import {
  createProjectModal,
  projectDetails,
  projectListPage,
} from '~/__tests__/cypress/cypress/pages/projects';
import {
  ProjectModel,
  SelfSubjectAccessReviewModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { mockProjectsK8sList } from '~/__mocks__';
import { homePage } from '~/__tests__/cypress/cypress/pages/home';

const interceptAccessReview = (allowed: boolean) => {
  cy.interceptK8s(
    'POST',
    SelfSubjectAccessReviewModel,
    mockSelfSubjectAccessReview({ allowed }),
  ).as('selfSubjectAccessReviewsCall');
};

describe('Home page Projects section', () => {
  it('should hide the projects section when disabled', () => {
    homePage.initHomeIntercepts({ disableHome: false, disableProjects: true });
    homePage.visit();

    cy.findByTestId('landing-page-projects').should('not.exist');
  });
  it('should show the empty state w/ create button when privileged', () => {
    homePage.initHomeIntercepts({ disableHome: false });
    homePage.visit();

    cy.findByTestId('landing-page-projects-empty').should('be.visible');
  });
  it('should show allow project creation from the empty state when privileged', () => {
    homePage.initHomeIntercepts({ disableHome: false });
    homePage.visit();

    cy.findByTestId('landing-page-projects-empty').should('be.visible');
    cy.findByTestId('create-project-button').click();
    createProjectModal.shouldBeOpen();
    createProjectModal.findCancelButton().click();
    createProjectModal.shouldBeOpen(false);
  });
  it('should show not allow project creation from the empty state when not privileged', () => {
    homePage.initHomeIntercepts({ disableHome: false });
    interceptAccessReview(false);
    homePage.visit();

    cy.findByTestId('landing-page-projects-empty').should('be.visible');
    cy.findByTestId('create-project-button').should('not.exist');
  });
  it('should show create project button when more projects exist', () => {
    homePage.initHomeIntercepts({ disableHome: false });
    const projectsMock = mockProjectsK8sList();

    cy.interceptK8sList(ProjectModel, projectsMock);

    homePage.visit();

    cy.findByTestId('create-project').should('be.visible');
    cy.findByTestId('create-project-card').should('not.exist');
  });
  it('should not show create project button when more projects exist but user is not allowed', () => {
    homePage.initHomeIntercepts({ disableHome: false });
    interceptAccessReview(false);
    const projectsMock = mockProjectsK8sList();

    cy.interceptK8sList(ProjectModel, projectsMock);

    homePage.visit();

    cy.findByTestId('create-project').should('not.exist');
    cy.findByTestId('create-project-card').should('not.exist');
    cy.findByTestId('request-project-help').should('be.visible');
    cy.findByTestId('request-project-card').should('not.exist');
  });
  it('should show create project card when no more projects exist', () => {
    homePage.initHomeIntercepts({ disableHome: false });
    const projectsMock = mockProjectsK8sList();
    const projects = projectsMock.items;
    projectsMock.items = projects.slice(0, 2);

    cy.interceptK8sList(ProjectModel, projectsMock);

    homePage.visit();

    cy.findByTestId('create-project').should('not.exist');
    cy.findByTestId('create-project-card').should('be.visible');
  });
  it('should show a request project card when no more projects exist but user is not allowed', () => {
    homePage.initHomeIntercepts({ disableHome: false });
    interceptAccessReview(false);
    const projectsMock = mockProjectsK8sList();
    const projects = projectsMock.items;
    projectsMock.items = projects.slice(0, 2);

    cy.interceptK8sList(ProjectModel, projectsMock);

    homePage.visit();

    cy.findByTestId('create-project').should('not.exist');
    cy.findByTestId('create-project-card').should('not.exist');
    cy.findByTestId('request-project-card').should('be.visible');
    cy.findByTestId('request-project-help').should('not.exist');
  });
  it('should navigate to the project when the name is clicked', () => {
    homePage.initHomeIntercepts({ disableHome: false });
    interceptAccessReview(false);
    const projectsMock = mockProjectsK8sList();
    const projects = projectsMock.items;
    projectsMock.items = projects.slice(0, 2);

    cy.interceptK8sList(ProjectModel, projectsMock);

    homePage.visit();

    cy.findByTestId(`project-link-${projects[0].metadata.name}`).click();
    cy.url().should('include', projects[0].metadata.name);
    projectDetails.findComponent('overview').should('be.visible');
  });
  it('should navigate to the project list', () => {
    homePage.initHomeIntercepts({ disableHome: false });
    interceptAccessReview(false);
    const projectsMock = mockProjectsK8sList();
    const projects = projectsMock.items;
    projectsMock.items = projects.slice(0, 2);

    cy.interceptK8sList(ProjectModel, projectsMock);

    homePage.visit();

    cy.findByTestId('goto-projects-link').click();
    projectListPage.findProjectsTable().should('be.visible');
  });
});
