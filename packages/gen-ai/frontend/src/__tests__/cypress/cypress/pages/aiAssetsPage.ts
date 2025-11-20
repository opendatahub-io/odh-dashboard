class AIAssetsPage {
  visit(namespace?: string): void {
    if (namespace) {
      cy.visit(`/gen-ai-studio/assets/${namespace}`);
    } else {
      cy.visit('/gen-ai-studio/assets');
    }
    this.waitForPageLoad();
  }

  private waitForPageLoad(): void {
    cy.findByTestId('page-title', { timeout: 15000 })
      .should('be.visible')
      .should('contain.text', 'AI asset endpoints');
    cy.findByRole('tab', { timeout: 10000 }).should('exist');
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
