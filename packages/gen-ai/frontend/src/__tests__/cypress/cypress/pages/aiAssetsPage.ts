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
    return cy.findByTestId('ai-assets-tab-ai-assets-mcp-servers-tab');
  }

  switchToMCPServersTab(): void {
    this.findMCPServersTab().click();
    this.waitForTabLoad();
  }
}

export const aiAssetsPage = new AIAssetsPage();
