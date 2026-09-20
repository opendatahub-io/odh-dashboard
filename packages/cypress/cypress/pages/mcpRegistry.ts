class McpRegistry {
  visit(workspace?: string) {
    const qs = workspace ? `?workspace=${workspace}` : '';
    cy.visitWithLogin(`/ai-hub/mcp-servers/registry${qs}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-tab-page-title', { timeout: 30000 }).should('exist');
    cy.testA11y();
  }

  findPageTitle() {
    return cy.findByTestId('app-tab-page-title');
  }

  findMlflowUnavailableState() {
    return cy.findByTestId('mlflow-unavailable-empty-state');
  }

  findProjectSelector() {
    return cy.findByTestId('project-selector-toggle', { timeout: 30000 });
  }

  findProjectInDropdown(name: string) {
    return cy.findByRole('menuitem', { name });
  }

  shouldHaveWorkspace(workspace: string) {
    cy.url().should('include', `workspace=${workspace}`);
  }
}

export const mcpRegistry = new McpRegistry();
