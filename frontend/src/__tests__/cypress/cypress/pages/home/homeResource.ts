import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';

export class HomeResource extends Contextual<HTMLElement> {
  findCard(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(`resource-card-${name}`);
  }

  findGoToResourceLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('goto-learning-resources-link');
  }
}
