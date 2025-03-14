class RegisterCatalogModelPage {
  visit(skipA11yCheck = false) {
    const sourceName = 'Red%20Hat';
    const repositoryName = 'rhelai1';
    const modelName = 'granite-8b-code-instruct';
    const tag = '1%2E3%2E0';
    cy.visitWithLogin(`/modelCatalog/${sourceName}/${repositoryName}/${modelName}/${tag}/register`);
    this.wait(skipA11yCheck);
  }

  private wait(skipA11yCheck = false) {
    const modelName = 'granite-8b-code-instruct';

    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains(`Register ${modelName} model`);
    if (!skipA11yCheck) {
      cy.testA11y();
    }
  }

  findModelRegistrySelector() {
    return cy.findByTestId('model-registry-selector-dropdown');
  }
}
export const registerCatalogModelPage = new RegisterCatalogModelPage();
