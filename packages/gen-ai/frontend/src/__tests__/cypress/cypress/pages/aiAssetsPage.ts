class AIAssetsPage {
  visit(namespace?: string, queryParams?: Record<string, string>): void {
    const qs = queryParams ? `?${new URLSearchParams(queryParams).toString()}` : '';
    if (namespace) {
      cy.visit(`/gen-ai-studio/assets/${namespace}${qs}`);
    } else {
      cy.visit(`/gen-ai-studio/assets${qs}`);
    }
    this.waitForPageLoad();
  }

  private waitForPageLoad(): void {
    cy.findByTestId('page-title', { timeout: 15000 })
      .should('be.visible')
      .should('contain.text', 'AI asset endpoints');
    cy.findAllByRole('tab', { timeout: 10000 }).should('have.length.at.least', 1);
  }

  waitForTabLoad(): void {
    cy.findByRole('tabpanel', { timeout: 10000 }).should('be.visible');
  }

  findMCPServersTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('ai-assets-tab-mcpservers');
  }

  switchToMCPServersTab(): void {
    this.findMCPServersTab().click();
    this.waitForTabLoad();
  }

  findMCPServersTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-servers-table');
  }

  findMCPServerRow(serverName: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findMCPServersTable().contains('tr', serverName);
  }

  findMCPServerCheckbox(serverName: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findMCPServerRow(serverName).findByRole('checkbox');
  }

  findTryInPlaygroundButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('try-in-playground-button');
  }

  findAgentProfilesTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('ai-assets-tab-agentprofile');
  }

  switchToAgentProfilesTab(): void {
    this.findAgentProfilesTab().click();
    this.waitForTabLoad();
  }
}

export const aiAssetsPage = new AIAssetsPage();
