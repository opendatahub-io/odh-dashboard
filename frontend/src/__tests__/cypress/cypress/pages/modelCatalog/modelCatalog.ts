import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';

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
    appChrome.findNavItem('Model catalog').click();
    this.wait();
  }

  private waitLanding() {
    cy.findByTestId('home-page').should('be.visible');
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('Model catalog');
    cy.testA11y();
  }

  tabEnabled() {
    appChrome.findNavItem('Model catalog').should('exist');
    return this;
  }

  tabDisabled() {
    appChrome.findNavItem('Model catalog').should('not.exist');
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

  findModelCatalogDetailsEmptyState() {
    return cy.findByTestId('empty-model-catalog-details-state');
  }

  findModelCatalogNotFoundState() {
    return cy.findByTestId('not-found-page');
  }
}

export const modelCatalog = new ModelCatalog();
