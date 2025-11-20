import { Contextual } from './Contextual';

export class TableRow extends Contextual<HTMLTableRowElement> {
  findCheckbox(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return this.find().find('input[type="checkbox"]');
  }
}
