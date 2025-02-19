class ModelDetailsPage {
  visit() {
    const sourceName = 'Red%20Hat';
    const repositoryName = 'rhelai1';
    const modelName = 'granite-8b-code-instruct';
    const tag = '1%252E3%252E0';
    cy.visitWithLogin(`/modelCatalog/${sourceName}/${repositoryName}/${modelName}/${tag}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findRegisterModelButton() {
    return cy.findByTestId('register-model-button');
  }

  findLongDescription() {
    return cy.findByTestId('model-long-description');
  }

  findModelVersion() {
    return cy.findByTestId('model-version');
  }

  findModelLicenseLink() {
    return cy.findByTestId('model-license').findByTestId('model-license-link');
  }

  findModelProvider() {
    return cy.findByTestId('model-provider');
  }

  findModelSourceImageLocation() {
    return cy.findByTestId('source-image-location');
  }

  findModelCardMarkdown() {
    return cy.findByTestId('model-card-markdown');
  }

  findModelCatalogEmptyState() {
    return cy.findByTestId('empty-model-catalog-state');
  }

  findRegisterCatalogModelPopover() {
    return cy.findByTestId('register-catalog-model-popover');
  }
}

export const modelDetailsPage = new ModelDetailsPage();
