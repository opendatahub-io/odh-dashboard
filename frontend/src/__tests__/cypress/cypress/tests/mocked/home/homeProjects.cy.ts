import { mockSelfSubjectAccessReview } from '#~/__mocks__/mockSelfSubjectAccessReview';
import {
  createProjectModal,
  projectDetails,
  projectListPage,
} from '#~/__tests__/cypress/cypress/pages/projects';
import {
  ProjectModel,
  SelfSubjectAccessReviewModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { mockProjectsK8sList } from '#~/__mocks__';
import { homePage } from '#~/__tests__/cypress/cypress/pages/home/home';

const interceptAccessReview = (allowed: boolean) => {
  cy.interceptK8s(
    'POST',
    SelfSubjectAccessReviewModel,
    mockSelfSubjectAccessReview({ allowed }),
  ).as('selfSubjectAccessReviewsCall');
};

describe('Home page Projects section', () => {
  it('should hide the projects section when disabled', () => {
    homePage.initHomeIntercepts({ disableProjects: true });
    homePage.visit();

    homePage.getHomeProjectSection().find().should('not.exist');
  });

  it('should show the empty state w/ create button when privileged', () => {
    homePage.initHomeIntercepts();
    homePage.visit();

    const homeProjectSection = homePage.getHomeProjectSection();
    homeProjectSection.findEmptyProjectCard().should('be.visible');
  });

  it('should show allow project creation from the empty state when privileged', () => {
    homePage.initHomeIntercepts();
    homePage.visit();

    const homeProjectSection = homePage.getHomeProjectSection();
    homeProjectSection.findEmptyProjectCard().should('be.visible');
    homeProjectSection.findCreateProjectButton().click();
    createProjectModal.shouldBeOpen();
    createProjectModal.findCancelButton().click();
    createProjectModal.shouldBeOpen(false);
  });

  it('should show not allow project creation from the empty state when not privileged', () => {
    homePage.initHomeIntercepts();
    interceptAccessReview(false);
    homePage.visit();

    const homeProjectSection = homePage.getHomeProjectSection();
    homeProjectSection.findEmptyProjectCard().should('be.visible');
    homeProjectSection.findCreateProjectButton().should('not.exist');
  });

  it('should show create project button when more projects exist', () => {
    homePage.initHomeIntercepts();
    const projectsMock = mockProjectsK8sList();

    cy.interceptK8sList(ProjectModel, projectsMock);

    homePage.visit();

    const homeProjectSection = homePage.getHomeProjectSection();
    homeProjectSection.findSectionHeaderCreateProjectButton().should('be.visible');
    homeProjectSection.findCreateProjectCard().should('not.exist');
  });

  it('should not show create project button when more projects exist but user is not allowed', () => {
    homePage.initHomeIntercepts();
    interceptAccessReview(false);
    const projectsMock = mockProjectsK8sList();

    cy.interceptK8sList(ProjectModel, projectsMock);

    homePage.visit();

    const homeProjectSection = homePage.getHomeProjectSection();
    homeProjectSection.findSectionHeaderCreateProjectButton().should('not.exist');
    homeProjectSection.findCreateProjectCard().should('not.exist');
    homeProjectSection.findProjectRequestIcon().should('be.visible');
    homeProjectSection.findRequestProjectCard().should('not.exist');
  });

  it('should show create project card when no more projects exist', () => {
    homePage.initHomeIntercepts();
    const projectsMock = mockProjectsK8sList();
    const projects = projectsMock.items;
    projectsMock.items = projects.slice(0, 2);

    cy.interceptK8sList(ProjectModel, projectsMock);

    homePage.visit();

    const homeProjectSection = homePage.getHomeProjectSection();
    homeProjectSection.findSectionHeaderCreateProjectButton().should('not.exist');
    homeProjectSection.findCreateProjectCard().should('be.visible');
  });

  it('should show a request project card when more projects exist but user is not allowed', () => {
    homePage.initHomeIntercepts();
    interceptAccessReview(false);
    const projectsMock = mockProjectsK8sList();
    const projects = projectsMock.items;
    projectsMock.items = projects.slice(0, 2);

    cy.interceptK8sList(ProjectModel, projectsMock);

    homePage.visit();

    const homeProjectSection = homePage.getHomeProjectSection();
    homeProjectSection.findSectionHeaderCreateProjectButton().should('not.exist');
    homeProjectSection.findCreateProjectCard().should('not.exist');
    homeProjectSection.findRequestProjectCard().should('be.visible');
    homeProjectSection.findProjectRequestIcon().should('not.exist');
  });

  it('should navigate to the project when the name is clicked', () => {
    homePage.initHomeIntercepts();
    interceptAccessReview(false);
    const projectsMock = mockProjectsK8sList();
    const projects = projectsMock.items;
    projectsMock.items = projects.slice(0, 2);

    cy.interceptK8sList(ProjectModel, projectsMock);

    homePage.visit();

    const homeProjectSection = homePage.getHomeProjectSection();
    homeProjectSection.findProjectLinkButton(projects[0].metadata.name).click();
    cy.url().should('include', projects[0].metadata.name);
    projectDetails.findComponent('overview').should('be.visible');
  });
  it('should navigate to the project list', () => {
    homePage.initHomeIntercepts();
    interceptAccessReview(false);
    const projectsMock = mockProjectsK8sList();
    const projects = projectsMock.items;
    projectsMock.items = projects.slice(0, 2);

    cy.interceptK8sList(ProjectModel, projectsMock);

    homePage.visit();

    const homeProjectSection = homePage.getHomeProjectSection();
    homeProjectSection.findGoToProjectLink().click();
    projectListPage.findProjectsTable().should('be.visible');
  });
});
