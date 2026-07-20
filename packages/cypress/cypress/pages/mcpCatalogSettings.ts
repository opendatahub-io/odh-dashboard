import { appChrome } from './appChrome';

class McpCatalogSettings {
  visit(wait = true) {
    cy.visitWithLogin('/settings/mcp-resources/mcp-catalog');
    if (wait) {
      this.wait();
    }
  }

  visitExpectDenied() {
    cy.visit('/settings/mcp-resources/mcp-catalog', { failOnStatusCode: false });
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

  findAddSourceButtonTable() {
    return cy.findByTestId('mcp-add-source-button');
  }

  findTable() {
    return cy.findByTestId('mcp-catalog-source-configs-table');
  }

  findEnableToggle(sourceId: string) {
    return cy.findByTestId(`mcp-enable-toggle-${sourceId}`);
  }

  findSourceName(sourceId: string) {
    return cy.findByTestId(`mcp-source-name-${sourceId}`);
  }

  findSourceStatus(sourceId: string) {
    return cy.findByTestId(`mcp-source-status-connected-${sourceId}`);
  }

  findManageSourceButton(sourceId: string) {
    return cy.findByTestId(`mcp-manage-source-button-${sourceId}`);
  }

  findSourceActions(sourceId: string) {
    return cy.findByTestId(`mcp-source-actions-${sourceId}`);
  }
}

export const mcpCatalogSettings = new McpCatalogSettings();
