class RegisterCatalogModelPage {
  visit() {
    const sourceName = 'Red%20Hat';
    const repositoryName = 'rhelai1';
    const modelName = 'granite-8b-code-instruct';
    const tag = '1%2E3%2E0';
    cy.visitWithLogin(`/modelCatalog/${sourceName}/${repositoryName}/${modelName}/${tag}/register`);
    this.wait();
  }

  private wait() {
    const modelName = 'granite-8b-code-instruct';

    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains(`Register ${modelName} model`);
    cy.testA11y();
  }

  findModelRegistrySelector() {
    return cy.findByTestId('model-registry-selector-dropdown');
  }
}
export const registerCatalogModelPage = new RegisterCatalogModelPage();
