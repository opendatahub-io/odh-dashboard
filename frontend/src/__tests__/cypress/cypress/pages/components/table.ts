import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';

export class TableRow extends Contextual<HTMLTableRowElement> {
  findExpandButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: 'Details' });
  }

  findRowCheckbox(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return this.find().find(`[data-label=Checkbox]`).find('input');
  }

  shouldBeMarkedForDeletion(): this {
    this.find()
      .findByRole('button', { name: 'This resource is marked for deletion.' })
      .should('exist');
    return this;
  }

  findKebabAction(name: string, verify = true): Cypress.Chainable<JQuery<HTMLElement>> {
    const kebabAction = this.find().findKebabAction(name);
    return verify ? kebabAction.should('exist').and('be.visible') : kebabAction;
  }

  findKebab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findKebab();
  }
}
