import { mcpCatalogSettingsUrl } from '~/app/routes/mcpCatalogSettings/mcpCatalogSettings';
import { appChrome } from './appChrome';
import { TableRow } from './components/table';

class McpCatalogSettings {
  visit() {
    cy.visit(mcpCatalogSettingsUrl());
    this.wait();
  }

  navigate() {
    cy.get('body').then(($body) => {
      if ($body.find('#page-sidebar').length > 0) {
        this.findNavItem().click();
        this.wait();
      }
    });
  }

  private wait() {
    this.findHeading();
    cy.testA11y();
  }

  findHeading() {
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('MCP catalog settings');
  }

  findNavItem() {
    return appChrome.findNavItem('MCP catalog settings', 'Settings');
  }

  findDescription() {
    return cy.contains('Add and manage MCP catalog sources');
  }

  findEmptyState() {
    return cy.findByTestId('mcp-catalog-settings-empty-state');
  }

  shouldBeEmpty() {
    this.findEmptyState().should('exist');
    return this;
  }

  findAddSourceButton() {
    return cy.findByTestId('mcp-add-source-button-empty');
  }

  findTable() {
    return cy.findByTestId('mcp-catalog-source-configs-table');
  }

  findRows() {
    return this.findTable().find('tbody tr');
  }

  shouldHaveRows() {
    this.findTable().should('exist');
    this.findRows().should('have.length.at.least', 1);
  }

  getRow(name: string) {
    return new TableRow(() =>
      this.findTable().find('tbody').find('tr').contains(name).parents('tr'),
    );
  }

  findToggleAlert() {
    return cy.findByTestId('mcp-toggle-alert');
  }

  findSourceStatusErrorAlert() {
    return cy.findByTestId('mcp-source-status-error-alert');
  }

  findSortButton(columnLabel: string) {
    return this.findTable().find('thead th').contains(columnLabel).find('button');
  }
}

class McpManageSourcePage {
  visitAddSource() {
    cy.visit(`${mcpCatalogSettingsUrl()}/add-source`);
    this.wait();
  }

  visitManageSource(catalogSourceId: string) {
    cy.visit(`${mcpCatalogSettingsUrl()}/manage-source/${encodeURIComponent(catalogSourceId)}`);
    this.wait();
  }

  private wait() {
    this.findHeading();
    cy.testA11y();
  }

  findHeading() {
    cy.findByTestId('app-page-title').should('exist');
  }

  findBreadcrumb() {
    return cy.get(`a[href="${mcpCatalogSettingsUrl()}"]`).contains('MCP catalog settings');
  }

  findBreadcrumbAction() {
    return cy.findByTestId('mcp-breadcrumb-source-action');
  }

  findAddSourceTitle() {
    return cy.findByTestId('app-page-title').contains('Add a source');
  }

  findManageSourceTitle() {
    return cy.findByTestId('app-page-title').contains('Manage source');
  }

  findAddSourceDescription() {
    return cy.contains('Add a new MCP catalog source to your organization.');
  }

  findManageSourceDescription() {
    return cy.contains('Manage the selected MCP catalog source.');
  }
}

export const mcpCatalogSettings = new McpCatalogSettings();
export const mcpManageSourcePage = new McpManageSourcePage();
