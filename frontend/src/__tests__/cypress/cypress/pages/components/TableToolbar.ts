import { Contextual } from './Contextual';

export class TableToolbar extends Contextual<HTMLElement> {
  private findToggleButton(id: string) {
    return cy.pfSwitch(id).click();
  }

  findFilterMenuOption(id: string, name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToggleButton(id).parents().findByRole('menuitem', { name });
  }

  findSearchInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByLabelText('Search input');
  }

  findResetButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('button', { name: 'Reset' });
  }
}
