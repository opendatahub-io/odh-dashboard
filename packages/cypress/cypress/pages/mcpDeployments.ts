import { TableRow } from './components/table';

class McpDeploymentTableRow extends TableRow {
  findServer(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-deployment-server');
  }

  findName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-deployment-name');
  }

  findStatusLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-deployment-status-label');
  }

  findServiceViewButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-deployment-service-view');
  }

  findServiceUnavailable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-deployment-service-unavailable');
  }

  findDeleteAction(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findKebabAction('Delete');
  }

  findEditAction(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findKebabAction('Edit');
  }
}

class McpDeployModal {
  findModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-deploy-modal');
  }

  shouldBeOpen(): void {
    this.findModal().should('be.visible');
  }

  shouldNotExist(): void {
    cy.findByTestId('mcp-deploy-modal').should('not.exist');
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-modal-title');
  }

  findNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-name');
  }

  findOciImageInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-oci-image-input');
  }

  findProjectSelector(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-project-selector');
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-submit-button');
  }

  findCloseButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-close-button');
  }

  findResetButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-reset-button');
  }

  findSubmitError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-submit-error');
  }

  findLoadError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-deploy-load-error');
  }

  findLoadingSpinner(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByRole('progressbar', {
      name: 'Loading MCP server configuration',
    });
  }
}

class McpServerDetailsPage {
  findDeployButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-deploy-button');
  }

  findBreadcrumbServerName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('breadcrumb-server-name');
  }

  // PF6 Button with isLoading renders an internal Spinner; no data-testid available
  findDeployButtonSpinner(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findDeployButton().find('.pf-v6-c-spinner');
  }
}

class McpDeploymentsPage {
  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-deployments-table');
  }

  findEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-deployments-empty-state');
  }

  findSelectProjectState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-deployments-select-project');
  }

  findFilterInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-deployments-filter-input');
  }

  findTableRows(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().find('tbody tr');
  }

  // mod-arch-shared ApplicationsPage uses data-id (not data-testid)
  findLoadingState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-id="loading-empty-state"]');
  }

  findLoadingSpinner(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findLoadingState().findByRole('progressbar');
  }

  findErrorState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-id="error-empty-state"]');
  }

  getRow(name: string): McpDeploymentTableRow {
    return new McpDeploymentTableRow(() =>
      cy.findByTestId(`mcp-deployment-row-${name}`).parents('tr'),
    );
  }
}

export const mcpDeploymentsPage = new McpDeploymentsPage();
export const mcpDeployModal = new McpDeployModal();
export const mcpServerDetailsPage = new McpServerDetailsPage();
