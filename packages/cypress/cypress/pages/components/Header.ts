export class Header {
  findApplicationLauncher(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('application-launcher');
  }

  findMenuDropdown(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('#user-menu-toggle');
  }

  findUnauthorizedErrorSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('unauthorized-error');
  }

  findUnauthorizedErrorTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('unauthorized-error-title');
  }
}

export const header = new Header();
