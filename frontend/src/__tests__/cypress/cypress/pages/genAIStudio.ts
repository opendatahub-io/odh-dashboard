/**
 * GenAI Studio Page Object
 *
 * Page object for GenAI Studio navigation and interactions.
 * Follows the Page Object Model (POM) pattern for maintainability.
 */
class GenAIStudioPage {
  /**
   * Navigate to GenAI Studio playground
   * @param namespace Optional namespace parameter
   */
  visit(namespace?: string): void {
    const path = namespace
      ? `/gen-ai-studio/playground/${namespace}`
      : '/gen-ai-studio/playground';
    cy.visit(path);
    this.waitForPageLoad();
  }

  /**
   * Wait for the GenAI Studio page to load
   */
  private waitForPageLoad(): void {
    this.findPageTitle({ timeout: 30000 }).should('be.visible').and('contain.text', 'Playground');
  }

  /**
   * Find the navigation link for GenAI Studio in the main navigation
   */
  findNavLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('nav-gen-ai-v3', { timeout: 30000 });
  }

  /**
   * Find the page title element
   */
  findPageTitle(options?: Partial<Cypress.Timeoutable>): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('page-title', options);
  }

  /**
   * Find the MCP servers panel/table
   */
  findMCPServersPanel(options?: Partial<Cypress.Timeoutable>): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-servers-panel-table', options);
  }

  /**
   * Verify that the GenAI Studio navigation link is visible
   */
  verifyNavLinkVisible(): void {
    this.findNavLink().should('exist').and('be.visible');
  }

  /**
   * Click on the GenAI Studio navigation link
   */
  navigateViaNav(): void {
    this.findNavLink().click();
  }

  /**
   * Verify that the user is on the GenAI Studio page
   * @param expectedNamespace Optional namespace to verify in the URL
   */
  verifyOnGenAIStudioPage(expectedNamespace?: string): void {
    if (expectedNamespace) {
      cy.location('pathname', { timeout: 30000 }).should((pathname) => {
        expect([
          `/gen-ai-studio/playground/${expectedNamespace}`,
          '/gen-ai-studio/playground',
          '/gen-ai-studio',
        ]).to.include(pathname);
      });
    } else {
      cy.location('pathname', { timeout: 30000 }).should((pathname) => {
        expect(['/gen-ai-studio/playground', '/gen-ai-studio']).to.include(pathname);
      });
    }
    this.waitForPageLoad();
  }

  /**
   * Verify that the MCP servers panel is visible
   */
  verifyMCPServersPanelVisible(): void {
    this.findMCPServersPanel({ timeout: 30000 }).should('exist').and('be.visible');
  }
}

export const genAIStudioPage = new GenAIStudioPage();

