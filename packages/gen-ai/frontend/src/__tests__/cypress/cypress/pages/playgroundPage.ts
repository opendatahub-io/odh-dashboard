import { mcpTab } from './playgroundPage/mcpTab';

class PlaygroundPage {
  mcpTab = mcpTab;

  visit(namespace?: string): void {
    cy.visit(namespace ? `/gen-ai-studio/playground/${namespace}` : '/gen-ai-studio/playground');
    this.waitForPageLoad();
  }

  private waitForPageLoad(): void {
    cy.findByTestId('page-title', { timeout: 30000 })
      .should('be.visible')
      .and('contain.text', 'Playground');
  }

  verifyOnPlaygroundPage(expectedNamespace?: string): void {
    if (expectedNamespace) {
      cy.location('pathname', { timeout: 60000 }).should((pathname) => {
        expect([
          `/gen-ai-studio/playground/${expectedNamespace}`,
          '/gen-ai-studio/playground',
        ]).to.include(pathname);
      });
    }
    this.waitForPageLoad();
  }
}

export const playgroundPage = new PlaygroundPage();
