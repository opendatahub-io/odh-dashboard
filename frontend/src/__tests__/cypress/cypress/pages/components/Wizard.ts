import type { ByRoleOptions } from '@testing-library/react';

export class Wizard {
  constructor(private title: ByRoleOptions['name'], private submitButtonText: string) {}

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('dialog', { name: this.title });
  }

  findFooter(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('footer');
  }

  shouldBeOpen(open = true): void {
    if (open) {
      this.find().testA11y();
    } else {
      this.find().should('not.exist');
    }
  }

  findNextButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findFooter().findByRole('button', { name: 'Next' });
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findFooter().findByRole('button', { name: this.submitButtonText });
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
