class AIAssetsPage {
  visit(namespace?: string): void {
    if (namespace) {
      cy.visit(`/gen-ai-studio/assets/${namespace}`);
    } else {
      cy.visit('/gen-ai-studio/assets');
    }
    this.waitForPageLoad();
  }

  navigate(namespace?: string): void {
    this.visit(namespace);
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

  findModelsTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('ai-assets-tab-ai-assets-models-tab');
  }

  findMaaSTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('ai-assets-tab-ai-assets-maas-tab');
  }

  findMCPServersTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('ai-assets-tab-ai-assets-mcp-servers-tab');
  }

  verifyAllTabsVisible(): void {
    this.findModelsTab().should('be.visible');
    this.findMaaSTab().should('be.visible');
    this.findMCPServersTab().should('be.visible');
  }
}

export const aiAssetsPage = new AIAssetsPage();
