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
    // Wait for tabs to be rendered
    cy.get('[role="tab"]', { timeout: 10000 }).should('have.length.at.least', 1);
  }

  findModelsTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.contains('[role="tab"]', /Models/i);
  }

  findMCPServersTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.contains('[role="tab"]', /MCP Servers/i);
  }

  switchToMCPServersTab(): void {
    // Wait for tabs to be stable before clicking
    cy.log('Switching to MCP Servers tab...');
    // Use a more robust approach: wait for element to be stable
    cy.get('[role="tab"]').should('have.length.at.least', 2);
    // Find and click in separate steps to avoid detachment
    cy.contains('[role="tab"]', /MCP Servers/i)
      .should('be.visible')
      .should('not.be.disabled')
      .then(($tab) => {
        // Use jQuery click to avoid Cypress actionability issues during re-render
        $tab.trigger('click');
      });
    this.waitForTabLoad();
  }

  private waitForTabLoad(): void {
    cy.log('Waiting for tab content to load...');
    // Wait for the tab panel to be visible and stable
    cy.get('[role="tabpanel"]', { timeout: 15000 }).should('be.visible');

    // Wait for content to load - either a table, empty state message, or error appears
    // This handles all possible outcomes: success, empty state, or error
    // Use :visible to get only the active/visible tabpanel
    cy.get('[role="tabpanel"]:visible', { timeout: 30000 })
      .first()
      .within(() => {
        cy.get(
          'table, [role="table"], [data-testid*="table"], [class*="pf-v6-c-empty-state"], [class*="no-data"]',
        ).should('exist');
      });
  }

  verifyBothTabsVisible(): void {
    this.findModelsTab().should('be.visible');
    this.findMCPServersTab().should('be.visible');
  }
}

export const aiAssets = new AIAssets();
