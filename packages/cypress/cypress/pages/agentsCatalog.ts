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
}

export const agentsCatalogPage = new AgentsCatalogPage();
