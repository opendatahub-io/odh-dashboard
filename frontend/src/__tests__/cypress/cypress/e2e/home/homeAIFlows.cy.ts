import { initHomeIntercepts } from '~/__tests__/cypress/cypress/e2e/home/homeUtils';

describe('Home page AI Flows', () => {
  it('should show the appropriate AI flow cards', () => {
    initHomeIntercepts({ disableHome: false });
    cy.visit('/');

    cy.findByTestId('ai-flow-projects-card').should('be.visible');
    cy.findByTestId('ai-flow-train-card').should('be.visible');
    cy.findByTestId('ai-flow-models-card').should('be.visible');
  });
  it('should show the appropriate info cards', () => {
    initHomeIntercepts({ disableHome: false });
    cy.visit('/');

    cy.findByTestId('ai-flow-projects-card').click();
    cy.findByTestId('ai-flows-projects-info').should('be.visible');
    cy.findByTestId('ai-flows-connections-info').should('be.visible');
    cy.findByTestId('ai-flows-storage-info').should('be.visible');

    cy.findByTestId('ai-flow-train-card').click();
    cy.findByTestId('ai-flows-workbenches-info').should('be.visible');
    cy.findByTestId('ai-flows-pipelines-info').should('be.visible');
    cy.findByTestId('ai-flows-runs-info').should('be.visible');

    cy.findByTestId('ai-flow-models-card').click();
    cy.findByTestId('ai-flows-model-servers-info').should('be.visible');
    cy.findByTestId('ai-flows-model-deploy-info').should('be.visible');
  });
  it('should close the info cards on re-click', () => {
    initHomeIntercepts({ disableHome: false });
    cy.visit('/');

    cy.findByTestId('ai-flow-projects-card').click();
    cy.findByTestId('ai-flows-projects-info').should('be.visible');
    cy.findByTestId('ai-flows-connections-info').should('be.visible');
    cy.findByTestId('ai-flows-storage-info').should('be.visible');

    cy.findByTestId('ai-flow-projects-card').click();
    cy.findByTestId('ai-flows-projects-info').should('not.exist');
    cy.findByTestId('ai-flows-connections-info').should('not.exist');
    cy.findByTestId('ai-flows-storage-info').should('not.exist');
  });
  it('should close the info cards on close button click', () => {
    initHomeIntercepts({ disableHome: false });
    cy.visit('/');

    cy.findByTestId('ai-flow-projects-card').click();
    cy.findByTestId('ai-flows-projects-info').should('be.visible');
    cy.findByTestId('ai-flows-connections-info').should('be.visible');
    cy.findByTestId('ai-flows-storage-info').should('be.visible');

    cy.findByTestId('ai-flows-close-info').click();
    cy.findByTestId('ai-flows-projects-info').should('not.exist');
    cy.findByTestId('ai-flows-connections-info').should('not.exist');
    cy.findByTestId('ai-flows-storage-info').should('not.exist');
  });
  it('should hide sections that are disabled', () => {
    initHomeIntercepts({
      disableHome: false,
      disableProjects: true,
    });
    cy.visit('/');
    cy.findByTestId('home-page').should('be.visible');

    cy.findByTestId('ai-flow-projects-card').should('not.exist');

    initHomeIntercepts({
      disableHome: false,
      disableModelServing: true,
    });
    cy.visit('/');
    cy.findByTestId('home-page').should('be.visible');
    cy.findByTestId('ai-flow-models-card').should('not.exist');
  });
  it('should hide info cards that are disabled', () => {
    initHomeIntercepts({
      disableHome: false,
      disablePipelines: true,
    });
    cy.visit('/');
    cy.findByTestId('home-page').should('be.visible');

    cy.findByTestId('ai-flow-train-card').click();

    cy.findByTestId('ai-flows-workbenches-info').should('be.visible');
    cy.findByTestId('ai-flows-pipelines-info').should('not.exist');
    cy.findByTestId('ai-flows-runs-info').should('not.exist');
  });
});
