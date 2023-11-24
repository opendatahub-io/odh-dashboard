// export or import required otherwise error
export {};

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      visitWithLogin(url: string, username?: string, password?: string): Cypress.Chainable<void>;

      findKebab(): Cypress.Chainable<JQuery>;
      findKebabAction(name: string): Cypress.Chainable<JQuery>;
    }
  }
}

Cypress.Commands.add(
  'visitWithLogin',
  (url, username = Cypress.env('USERNAME'), password = Cypress.env('PASSWORD')) => {
    cy.intercept('GET', url).as('visitWithLogin');

    cy.visit(url, { failOnStatusCode: false });

    cy.wait('@visitWithLogin').then((interception) => {
      if (interception.response?.statusCode === 403) {
        // do login
        cy.findByRole('button', { name: 'Log in with OpenShift' }).click();
        cy.findByRole('link', { name: 'customadmins' }).click();
        cy.findByLabelText('Username *').type(username);
        cy.findByLabelText('Password *').type(password);
        cy.findByRole('button', { name: 'Log in' }).click();
      } else if (interception.response?.statusCode !== 200) {
        throw new Error(
          `Failed to visit '${url}'. Status code: ${
            interception.response?.statusCode || 'unknown'
          }`,
        );
      } else {
        cy.log('Already logged in');
      }
    });
  },
);

Cypress.Commands.add('findKebab', () => {
  return cy.findByRole('button', { name: 'Kebab toggle' });
});

Cypress.Commands.add('findKebabAction', (name) => {
  return cy.findByRole('menuitem', { name });
});
