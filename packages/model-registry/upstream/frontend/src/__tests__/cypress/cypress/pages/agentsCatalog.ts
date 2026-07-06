import { appChrome } from './appChrome';

class AgentsCatalog {
  visit() {
    cy.visit('/agents-catalog');
    this.wait();
  }

  private wait() {
    cy.contains('Agents Catalog').should('exist');
    cy.testA11y();
  }

  tabEnabled() {
    appChrome.findNavItem('Agents Catalog').should('exist');
    return this;
  }

  findPageTitle() {
    return cy.contains('Agents Catalog');
  }
}

class AgentDetailsPage {
  visit(agentName: string) {
    cy.visit(`/agents-catalog/${agentName}/overview`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findBreadcrumbCatalogLink() {
    return cy.get('.pf-v6-c-breadcrumb').contains('Agents Catalog');
  }

  findBreadcrumbAgentName() {
    return cy.findByTestId('breadcrumb-agent-name');
  }
}

export const agentsCatalog = new AgentsCatalog();
export const agentDetailsPage = new AgentDetailsPage();
