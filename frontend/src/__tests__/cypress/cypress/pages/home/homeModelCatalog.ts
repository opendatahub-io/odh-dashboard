import { Contextual } from '~/__tests__/cypress/cypress/pages/components/Contextual';

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

  getModelCatalogCardDescription(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('model-catalog-card-description');
  }

  getModelCatalogCardDescriptionTooltip(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().get('.pf-v6-c-tooltip');
  }

  getModelCatalogFooter(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('model-catalog-footer');
  }

  getModelCatalogFooterLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('goto-model-catalog-link');
  }
}
