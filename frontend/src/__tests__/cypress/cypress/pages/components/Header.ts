export class Header {
  findApplicationLauncher(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-testid="application-launcher"]');
  }

  findMenuDropdown(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('#user-menu-toggle');
  }
}

export const header = new Header();
