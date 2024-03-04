import { Contextual } from '~/__tests__/cypress/cypress/pages/components/Contextual';

export class TableRow extends Contextual<HTMLTableRowElement> {
  shouldBeMarkedForDeletion(): this {
    this.find()
      .findByRole('button', { name: 'This resource is marked for deletion.' })
      .should('exist');
    return this;
  }

  findKebabAction(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findKebabAction(name);
  }
}
