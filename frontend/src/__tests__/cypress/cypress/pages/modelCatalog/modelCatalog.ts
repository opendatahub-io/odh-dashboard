import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';

class ModelCatalog {
  landingPage() {
    cy.visitWithLogin('/');
    this.waitLanding();
  }

  visit() {
    cy.visitWithLogin(`/modelCatalog`);
    this.wait();
  }

  visitTempDetails() {
    cy.visitWithLogin(`/modelCatalog/tempDetails`);
    this.wait();
  }

  navigate() {
    appChrome.findNavItem({ name: 'Catalog', rootSection: 'AI hub' }).click();
    this.wait();
  }

  private waitLanding() {
    cy.findByTestId('home-page').should('be.visible');
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('Catalog');
    cy.testA11y();
  }

  tabEnabled() {
    appChrome.findNavItem({ name: 'Catalog', rootSection: 'AI hub' }).should('exist');
    return this;
  }

  tabDisabled() {
    appChrome.findNavItem({ name: 'Catalog', rootSection: 'AI hub' }).should('not.exist');
    return this;
  }

  findModelCatalogEmptyState() {
    return cy.findByTestId('empty-model-catalog-state');
  }

  findModelCatalogModelDetailLink(modelName: string) {
    return cy.findByTestId(`model-catalog-detail-link`).contains(modelName);
  }

  findModelCatalogCards() {
    return cy.findByTestId('model-catalog-cards');
  }

  findModelCatalogCard(modelName: string) {
    return cy
      .findAllByTestId('model-catalog-card')
      .contains('[data-testid~=model-catalog-card]', modelName);
  }

  expandCardLabelGroup(modelName: string) {
    this.findModelCatalogCard(modelName)
      .findAllByTestId('model-catalog-label-group')
      .find('button')
      .click();
  }

  findCardLabelByIndex(modelName: string, index: number) {
    return this.findModelCatalogCard(modelName).findAllByTestId('model-catalog-label').eq(index);
  }

  findCardLabelByText(modelName: string, text: string) {
    return this.findModelCatalogCard(modelName)
      .findAllByTestId('model-catalog-label')
      .contains(text);
  }

  findModelCatalogCardsLabelGroup() {
    return cy.findByTestId('model-catalog-label-group');
  }

  findModelCatalogDetailsEmptyState() {
    return cy.findByTestId('empty-model-catalog-details-state');
  }

  findModelCatalogNotFoundState() {
    return cy.findByTestId('not-found-page');
  }
}

export const modelCatalog = new ModelCatalog();
