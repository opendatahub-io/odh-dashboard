import Chainable = Cypress.Chainable;

export class LoginDialog {
  findText(): Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('timeout-text');
  }
}

export const loginDialog = new LoginDialog();
