import { Contextual } from './Contextual';

export class TableRow extends Contextual<HTMLTableRowElement> {
  findCheckbox(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return this.find().find('input[type="checkbox"]');
  }

  check(): void {
    this.findCheckbox().check({ force: true });
  }

  shouldBeChecked(): this {
    this.findCheckbox().should('be.checked');
    return this;
  }

  shouldNotBeChecked(): this {
    this.findCheckbox().should('not.be.checked');
    return this;
  }
}
