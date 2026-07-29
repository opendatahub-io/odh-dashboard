import { appChrome } from './appChrome';

class AgentsCatalogPage {
  navigate() {
    appChrome.findNavItem({ name: 'Agents', rootSection: 'AI hub' }).click();
    this.wait();
  }

  visit() {
    cy.visitWithLogin('/ai-hub/agents/catalog');
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-tab-page-title').should('exist');
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem({ name: 'Agents', rootSection: 'AI hub' });
  }

  findPageTitle() {
    return cy.findByTestId('app-tab-page-title');
  }

  findAgentsCatalogCards() {
    return cy.findAllByTestId(/^agent-catalog-card-/);
  }

  findFirstAgentCardDetailLink() {
    return cy.findAllByTestId(/^agent-catalog-card-detail-link-/).first();
  }
}

class AgentDetailsPage {
  findBreadcrumbAgentName() {
    return cy.findByTestId('breadcrumb-agent-name');
  }

  findBreadcrumbCatalogLink() {
    return cy.get('[data-testid="breadcrumb-agent-name"]').parent().find('a').first();
  }

  findAgentDescription() {
    return cy.findByTestId('agent-description');
  }
}

export const agentsCatalogPage = new AgentsCatalogPage();
export const agentDetailsPage = new AgentDetailsPage();
