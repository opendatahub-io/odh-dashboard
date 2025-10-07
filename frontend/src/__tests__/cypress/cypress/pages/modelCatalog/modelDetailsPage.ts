class ModelDetailsPage {
  visit() {
    const sourceName = 'Red%20Hat';
    const repositoryName = 'rhelai1';
    const modelName = 'granite-8b-code-instruct';
    const tag = '1%252E3%252E0';
    cy.visitWithLogin(`/ai-hub/catalog/${sourceName}/${repositoryName}/${modelName}/${tag}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findRegisterModelButton() {
    return cy.findByTestId('register-model-button');
  }

  findDeployModelButton() {
    return cy.findByTestId('deploy-model-button');
  }

  findTuneModelButton() {
    return cy.findByTestId('tune-model-button');
  }

  findTuneModelPopover() {
    return cy.findByTestId('tune-model-popover');
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

  expandLabelGroup() {
    cy.findByTestId('model-catalog-label-group').find('button').click();
  }

  findLabelByIndex(index: number) {
    return cy.findAllByTestId('model-catalog-label').eq(index);
  }
}

export const modelDetailsPage = new ModelDetailsPage();
