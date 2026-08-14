import { Contextual } from '../components/Contextual';

export class HomeResource extends Contextual<HTMLElement> {
  findCard(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(`resource-card-${name}`);
  }

  findGoToResourceLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('goto-learning-resources-link');
  }

  findSectionHeading(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('heading', { name: 'Get oriented with learning resources' });
  }

  findErrorState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('error-empty-state');
  }
}
