class AgentDeploymentDetailPage {
  visit(namespace: string, agentId: string, tab = 'overview') {
    cy.visit(`/deployments/${namespace}/${agentId}/${tab}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('agent-deployment-breadcrumb-name').should('exist');
    cy.testA11y();
  }

  findBreadcrumbName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-deployment-breadcrumb-name');
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-deployment-title');
  }

  findStatusLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-runtime-status-label');
  }

  findOverviewTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-deployment-overview-tab');
  }

  findDescription(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-deployment-description');
  }

  findCapabilitiesCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-deployment-capabilities-card');
  }

  findAgentCardCopy(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-detail-agent-card-copy');
  }

  findVersion(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-detail-version');
  }

  findNotFoundState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-deployment-not-found');
  }
}

export const agentDeploymentDetailPage = new AgentDeploymentDetailPage();
