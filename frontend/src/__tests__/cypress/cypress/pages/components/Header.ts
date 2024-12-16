export class Header {
  findApplicationLauncher(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-testid="application-launcher"]');
  }
}

export const header = new Header();
