import { mcpTab } from './playgroundPage/mcpTab';

class PlaygroundPage {
  mcpTab = mcpTab;

  visit(namespace?: string, options?: { devFeatureFlags?: Record<string, boolean> }): void {
    const base = namespace ? `/gen-ai-studio/playground/${namespace}` : '/gen-ai-studio/playground';
    const url =
      options?.devFeatureFlags && Object.keys(options.devFeatureFlags).length > 0
        ? `${base}?devFeatureFlags=${Object.entries(options.devFeatureFlags)
            .map(([k, v]) => `${k}=${String(v)}`)
            .join(',')}`
        : base;
    cy.visit(url);
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
