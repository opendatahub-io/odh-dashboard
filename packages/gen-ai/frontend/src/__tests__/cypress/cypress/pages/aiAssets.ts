class AIAssets {
  visit(namespace?: string): void {
    if (namespace) {
      cy.visit(`/gen-ai-studio/assets/${namespace}`);
    } else {
      cy.visit('/gen-ai-studio/assets');
    }
    this.waitForPageLoad();
  }

  navigate(namespace?: string): void {
    // Alias for visit() - prefer this over direct cy.visit() in tests
    this.visit(namespace);
  }

  private waitForPageLoad(): void {
    cy.contains('h1', 'AI asset endpoints', { timeout: 15000 }).should('be.visible');
  }

  findModelsTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.contains('[role="tab"]', /Models/i);
  }

  findMCPServersTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.contains('[role="tab"]', /MCP Servers/i);
  }

  switchToMCPServersTab(): void {
    this.findMCPServersTab().should('be.visible').click();
    this.waitForTabLoad();
  }

  private waitForTabLoad(): void {
    cy.log('Waiting for tab content to load...');
    cy.get('body', { timeout: 20000 }).should(($body) => {
      const bodyText = $body.text();
      expect(bodyText).to.not.match(/^Loading$/);
    });
  }

  verifyBothTabsVisible(): void {
    this.findModelsTab().should('be.visible');
    this.findMCPServersTab().should('be.visible');
  }
}

export const aiAssets = new AIAssets();
