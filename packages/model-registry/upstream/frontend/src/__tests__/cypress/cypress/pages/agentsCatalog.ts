import { agentsCatalogUrl } from '~/app/routes/agentsCatalog/agentsCatalog';
import { appChrome } from './appChrome';

class AgentsCatalog {
  visit() {
    cy.visit(agentsCatalogUrl());
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

  findCards() {
    return cy.get('[data-testid^="agent-catalog-card-"]');
  }

  findCardByName(name: string) {
    return cy.get(`[data-testid="agent-catalog-card-${name}"]`);
  }

  findCardDetailLink(agentId: string) {
    return cy.findByTestId(`agent-catalog-card-detail-link-${agentId}`);
  }

  findCardDescription(agentId: string) {
    return cy.findByTestId(`agent-catalog-card-description-${agentId}`);
  }

  findCardFrameworkLabel(agentId: string) {
    return cy.findByTestId(`agent-catalog-card-framework-${agentId}`);
  }

  findCardLabels(agentId: string) {
    return cy.get(
      `[data-testid="agent-catalog-card-${agentId}"] [data-testid="agent-catalog-card-label-${agentId}"]`,
    );
  }

  findSearchInput() {
    return cy.findByTestId('agents-catalog-search-input');
  }

  findEmptyState() {
    return cy.findByTestId('empty-agents-catalog-state');
  }

  findNoCategoriesState() {
    return cy.findByTestId('empty-agents-catalog-no-categories');
  }

  findFilterPanel() {
    return cy.get('[data-testid^="agent-filter-"]').first();
  }

  findCategoryToggle() {
    return cy.findByTestId('agents-catalog-category-toggle');
  }
}

class AgentDetailsPage {
  visit(agentName: string) {
    cy.visit(`${agentsCatalogUrl()}/${agentName}/overview`);
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
