import { appChrome } from './appChrome';

class McpCatalogSettings {
  visit(wait = true) {
    cy.visitWithLogin('/settings/mcp-resources/mcp-catalog');
    if (wait) {
      this.wait();
    }
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  private wait() {
    this.findHeading();
    cy.testA11y();
  }

  private findHeading() {
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('MCP catalog settings');
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'MCP catalog sources',
      rootSection: 'Settings',
      subSection: 'MCP resources',
    });
  }

  findEmptyState() {
    return cy.findByTestId('mcp-catalog-settings-empty-state');
  }

  findAddSourceButton() {
    return cy.findByTestId('mcp-add-source-button-empty');
  }
}

export const mcpCatalogSettings = new McpCatalogSettings();
