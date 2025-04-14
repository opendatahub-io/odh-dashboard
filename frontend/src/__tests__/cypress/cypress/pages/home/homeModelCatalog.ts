import { Contextual } from '~/__tests__/cypress/cypress/pages/components/Contextual';

export class HomeModelCatalog extends Contextual<HTMLElement> {
  getModelCatalogHint(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('model-catalog-hint');
  }

  getModelCatalogHintCloseButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('model-catalog-hint-close');
  }

  getModelCatalogCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('model-catalog-card');
  }

  getModelCatalogLoading(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('model-catalog-loading');
  }

  getModelCatalogFooter(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('model-catalog-footer');
  }

  getModelCatalogFooterLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('goto-model-catalog-link');
  }
}
