import { homePage } from '~/__tests__/cypress/cypress/pages/home';

describe('Home page AI Flows', () => {
  beforeEach(() => {
    homePage.initHomeIntercepts();
    homePage.visit();
  });
  it('should show the appropriate AI flow cards', () => {
    cy.findByTestId('ai-flow-projects-card').should('be.visible');
    cy.findByTestId('ai-flow-train-card').should('be.visible');
    cy.findByTestId('ai-flow-models-card').should('be.visible');
  });
  it('should show the appropriate info cards', () => {
    homePage.getProjectsFlowCard().click();
    cy.findByTestId('ai-flows-projects-info').should('be.visible');
    cy.findByTestId('ai-flows-connections-info').should('be.visible');
    cy.findByTestId('ai-flows-storage-info').should('be.visible');

    homePage.getTrainFlowCard().click();
    cy.findByTestId('ai-flows-workbenches-info').should('be.visible');
    cy.findByTestId('ai-flows-pipelines-info').should('be.visible');
    cy.findByTestId('ai-flows-runs-info').should('be.visible');

    homePage.getModelsFlowCard().click();
    cy.findByTestId('ai-flows-model-servers-info').should('be.visible');
    cy.findByTestId('ai-flows-model-deploy-info').should('be.visible');
  });
  it('should close the info cards on re-click', () => {
    homePage.getProjectsFlowCard().click();
    cy.findByTestId('ai-flows-projects-info').should('be.visible');
    cy.findByTestId('ai-flows-connections-info').should('be.visible');
    cy.findByTestId('ai-flows-storage-info').should('be.visible');

    homePage.getProjectsFlowCard().click();
    cy.findByTestId('ai-flows-projects-info').should('not.exist');
    cy.findByTestId('ai-flows-connections-info').should('not.exist');
    cy.findByTestId('ai-flows-storage-info').should('not.exist');
  });
  it('should close the info cards on close button click', () => {
    homePage.getProjectsFlowCard().click();
    cy.findByTestId('ai-flows-projects-info').should('be.visible');
    cy.findByTestId('ai-flows-connections-info').should('be.visible');
    cy.findByTestId('ai-flows-storage-info').should('be.visible');

    homePage.clickAIFlowClose();
    cy.findByTestId('ai-flows-projects-info').should('not.exist');
    cy.findByTestId('ai-flows-connections-info').should('not.exist');
    cy.findByTestId('ai-flows-storage-info').should('not.exist');
  });
  it('should hide sections that are disabled', () => {
    homePage.initHomeIntercepts({ disableProjects: true });
    homePage.visit();

    homePage.getProjectsFlowCard().should('not.exist');

    homePage.initHomeIntercepts({ disableModelServing: true });
    homePage.visit();

    homePage.getModelsFlowCard().should('not.exist');
  });
  it('should hide info cards that are disabled', () => {
    homePage.initHomeIntercepts({ disablePipelines: true });
    homePage.visit();

    homePage.getTrainFlowCard().click();

    cy.findByTestId('ai-flows-workbenches-info').should('be.visible');
    cy.findByTestId('ai-flows-pipelines-info').should('not.exist');
    cy.findByTestId('ai-flows-runs-info').should('not.exist');
  });
  it('should render projects content specific to feature availability', () => {
    homePage.getProjectsFlowCard().click();
    cy.findByTestId('project-workbenches--trailer-model-mesh').scrollIntoView();

    homePage.initHomeIntercepts({ disableModelMesh: true });
    homePage.visit();
    homePage.getProjectsFlowCard().click();
    cy.findByTestId('project-workbenches--trailer-no-model-mesh').scrollIntoView();

    homePage.initHomeIntercepts({ disableModelServing: true });
    homePage.visit();
    homePage.getProjectsFlowCard().click();
    cy.findByTestId('project-workbenches--trailer-no-model-serving').scrollIntoView();

    homePage.initHomeIntercepts({ disablePipelines: true });
    homePage.visit();
    homePage.getProjectsFlowCard().click();
    cy.findByTestId('project-workbenches--trailer-no-pipelines').scrollIntoView();
  });
  it('should render workbenches content specific to feature availability', () => {
    homePage.getTrainFlowCard().click();
    cy.findByTestId('create-and-train-pipelines-trailer').scrollIntoView();

    homePage.initHomeIntercepts({ disablePipelines: true });
    homePage.visit();
    homePage.getTrainFlowCard().click();
    cy.findByTestId('create-and-train-no-pipelines-trailer').scrollIntoView();
  });
});
