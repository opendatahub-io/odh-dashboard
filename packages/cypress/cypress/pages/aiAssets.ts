class AiAssets {
  navigate(projectName: string) {
    cy.visit(`/gen-ai-studio/assets/${projectName}`);
    cy.url().should('include', `/gen-ai-studio/assets/${projectName}`);
  }

  findPageTitle() {
    return cy.findByRole('heading', { name: /AI asset endpoints/i });
  }

  findPageDescription() {
    return cy.contains('Browse endpoints for models and MCP servers');
  }

  findModelsTab() {
    return cy.findByTestId('ai-assets-tab-models');
  }

  findNavigationLink() {
    return cy.findByRole('link', { name: /AI asset endpoints/i });
  }
}

export const aiAssets = new AiAssets();
