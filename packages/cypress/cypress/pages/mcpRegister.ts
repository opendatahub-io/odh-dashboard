class McpRegisterPage {
  visit(serverId: string) {
    cy.visitWithLogin(`/ai-hub/mcp-servers/catalog/${serverId}`);
  }

  findBreadcrumbServerName() {
    return cy.findByTestId('breadcrumb-server-name');
  }

  findRegisterButton() {
    return cy.findByTestId('mcp-register-button');
  }

  findTooltip() {
    return cy.findByRole('tooltip');
  }

  shouldBeOnRegistryDetails(encodedName: string, workspace: string) {
    cy.location('pathname').should('eq', `/ai-hub/mcp-servers/registry/${encodedName}`);
    cy.location('search').should('eq', `?workspace=${workspace}`);
  }
}

class McpRegisterModal {
  find() {
    return cy.findByTestId('mcp-register-modal');
  }

  shouldBeOpen() {
    this.find().should('be.visible');
  }

  findTitle() {
    return this.find().findByTestId('mcp-register-modal-title');
  }

  findDisplayName() {
    return this.find().findByTestId('mcp-register-display-name');
  }

  findSource() {
    return this.find().findByTestId('mcp-register-source');
  }

  findTagKey(index = 0) {
    return this.find().findByTestId(`mcp-register-tag-key-${index}`);
  }

  findTagValue(index = 0) {
    return this.find().findByTestId(`mcp-register-tag-value-${index}`);
  }

  findSubmitButton() {
    return this.find().findByTestId('modal-submit-button');
  }

  findProjectSelectorToggle() {
    return this.find().findByTestId('project-selector-toggle');
  }

  findProjectSelectorOption(name: string) {
    return cy.findByTestId('project-selector-menuList').findByRole('menuitem', { name });
  }

  selectProject(name: string) {
    this.findProjectSelectorToggle().click();
    this.findProjectSelectorOption(name).click();
  }

  waitForRegister() {
    cy.wait('@registerMcpServer');
  }
}

export const mcpRegisterPage = new McpRegisterPage();
export const mcpRegisterModal = new McpRegisterModal();
