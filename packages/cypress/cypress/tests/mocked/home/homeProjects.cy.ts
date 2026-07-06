import { mockSelfSubjectAccessReview } from '@odh-dashboard/internal/__mocks__/mockSelfSubjectAccessReview';
import { mockProjectsK8sList } from '@odh-dashboard/internal/__mocks__';
import { createProjectModal, projectDetails, projectListPage } from '../../../pages/projects';
import { ProjectModel, SelfSubjectAccessReviewModel } from '../../../utils/models';
import { homePage } from '../../../pages/home/home';

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

  it('should not show create project button when more projects exist', () => {
    homePage.initHomeIntercepts();
    const projectsMock = mockProjectsK8sList();

    cy.interceptK8sList(ProjectModel, projectsMock);

    homePage.visit();

    const homeProjectSection = homePage.getHomeProjectSection();

    // Verify 4 cards total (3 project cards + 1 create new card)
    homeProjectSection.find().find('[data-testid*="-card"]').should('have.length', 4);

    // Verify all 3 projects have AI labels
    homeProjectSection.findAILabelInCard('ds-project-1').should('exist');
    homeProjectSection.findAILabelInCard('ds-project-2').should('exist');
    homeProjectSection.findAILabelInCard('ds-project-3').should('exist');

    homeProjectSection.findCreateProjectCard().should('exist');
    homeProjectSection.findSectionHeaderCreateProjectButton().should('not.exist');
  });

  it('should show create project button when more projects exist', () => {
    homePage.initHomeIntercepts();
    const projectsMock = mockProjectsK8sList(5);

    cy.interceptK8sList(ProjectModel, projectsMock);

    homePage.visit();

    const homeProjectSection = homePage.getHomeProjectSection();
    homeProjectSection.findSectionHeaderCreateProjectButton().should('be.visible');
    homeProjectSection.findCreateProjectCard().should('not.exist');
  });

  it('should not show create project button when more projects exist but user is not allowed', () => {
    homePage.initHomeIntercepts();
    interceptAccessReview(false);
    const projectsMock = mockProjectsK8sList(5);

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
