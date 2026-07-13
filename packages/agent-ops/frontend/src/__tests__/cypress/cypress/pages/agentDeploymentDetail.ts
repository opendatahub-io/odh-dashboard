class AgentDeploymentDetailPage {
  visit(namespace: string, agentId: string) {
    cy.visit(`/deployments/${namespace}/${agentId}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('agent-detail-loading').should('not.exist');
    cy.testA11y();
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-detail-title');
  }

  findStatusLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-runtime-status-label');
  }

  findDescriptionCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-description-card');
  }

  findDescription(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-description');
  }

  findAgentDetailsCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-card-details');
  }

  findSkillsSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-capabilities-skills');
  }

  findSkillCard(skillId: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`agent-skill-card-${skillId}`);
  }

  findLoadingState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-detail-loading');
  }

  findAccessDeniedState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-detail-access-denied');
  }

  findNotFoundState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-detail-not-found');
  }

  findErrorState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-detail-error');
  }
}

export const agentDeploymentDetailPage = new AgentDeploymentDetailPage();
