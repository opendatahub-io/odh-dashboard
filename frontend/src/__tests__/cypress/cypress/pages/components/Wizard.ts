import type { ByRoleOptions } from '@testing-library/react';

export class Wizard {
  constructor(private title: ByRoleOptions['name']) {}

  findFooter(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('footer');
  }

  findNextButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findFooter().findByRole('button', { name: 'Next' });
  }

  findBackButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findFooter().findByRole('button', { name: 'Back' });
  }

  findCancelButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findFooter().findByRole('button', { name: 'Cancel' });
  }

  findStep(step: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`#${step}`);
  }
}
