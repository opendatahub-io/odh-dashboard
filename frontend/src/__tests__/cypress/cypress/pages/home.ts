import { mockDashboardConfig } from '~/__mocks__';

class HomePage {
  visit() {
    cy.visit('/');
    this.wait();
  }

  private wait() {
    cy.findByTestId('home-page').should('be.visible');
    cy.testA11y();
  }

  initHomeIntercepts(config: Parameters<typeof mockDashboardConfig>[0] = {}) {
    cy.interceptOdh('GET /api/config', mockDashboardConfig(config));
  }

  getProjectsFlowCard() {
    return cy.findByTestId('ai-flow-projects-card');
  }

  getTrainFlowCard() {
    return cy.findByTestId('ai-flow-train-card');
  }

  getModelsFlowCard() {
    return cy.findByTestId('ai-flow-models-card');
  }

  clickAIFlowClose() {
    cy.findByTestId('ai-flows-close-info').click();
  }
}

export const homePage = new HomePage();
