import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockComponents } from '~/__mocks__/mockComponents';
import { enabledPage } from '~/__tests__/cypress/cypress/pages/enabled';

type HandlersProps = {
  disableHome?: boolean;
  disableProjects?: boolean;
  disableModelServing?: boolean;
  disablePipelines?: boolean;
};

const initIntercepts = (config: HandlersProps = {}) => {
  const dashboardConfig = {
    disableProjects: false,
    disableModelServing: false,
    disablePipelines: false,
    ...config,
  };
  cy.interceptOdh('GET /api/config', mockDashboardConfig(dashboardConfig));
  cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());
};

describe('Home page', () => {
  it('should not be shown by default', () => {
    initIntercepts();
    cy.visit('/');
    cy.findByTestId('enabled-application').should('be.visible');
  });
  it('should be shown when enabled', () => {
    initIntercepts({ disableHome: false });
    cy.visit('/');
    cy.findByTestId('home-page').should('be.visible');

    // enabled applications page is still navigable
    enabledPage.visit(true);
  });
  it('should show the appropriate AI flow cards', () => {
    initIntercepts({ disableHome: false });
    cy.visit('/');

    cy.findByTestId('ai-flow-projects-card').should('be.visible');
    cy.findByTestId('ai-flow-train-card').should('be.visible');
    cy.findByTestId('ai-flow-models-card').should('be.visible');
  });
  it('should show the appropriate info cards', () => {
    initIntercepts({ disableHome: false });
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
    initIntercepts({ disableHome: false });
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
    initIntercepts({ disableHome: false });
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
    initIntercepts({
      disableHome: false,
      disableProjects: true,
    });
    cy.visit('/');
    cy.findByTestId('home-page').should('be.visible');

    cy.findByTestId('ai-flow-projects-card').should('not.exist');

    initIntercepts({
      disableHome: false,
      disableModelServing: true,
    });
    cy.visit('/');
    cy.findByTestId('home-page').should('be.visible');
    cy.findByTestId('ai-flow-models-card').should('not.exist');
  });
  it('should hide info cards that are disabled', () => {
    initIntercepts({
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
