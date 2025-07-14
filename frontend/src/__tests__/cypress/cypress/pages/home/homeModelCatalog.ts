import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';

export class HomeModelCatalog extends Contextual<HTMLElement> {
  getModelCatalogHint(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('model-catalog-hint');
  }

  getModelCatalogHintCloseButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('model-catalog-hint-close');
  }

  getModelCatalogCardGallery(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('model-catalog-card-gallery');
  }

  getModelCatalogCardName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('model-catalog-card-name');
  }

  getModelCatalogCardDescription(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('model-catalog-card-description');
  }

  getModelCatalogCardNameTooltip(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.getModelCatalogCardName().get('.pf-v6-c-tooltip');
  }

  getModelCatalogCardDescriptionTooltip(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.getModelCatalogCardDescription().get('.pf-v6-c-tooltip');
  }

  getModelCatalogFooter(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('model-catalog-footer');
  }

  getModelCatalogFooterLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('goto-model-catalog-link');
  }
}
