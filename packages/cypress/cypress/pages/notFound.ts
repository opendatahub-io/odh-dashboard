export const notFoundPage = {
  findNotFoundPage(): Cypress.Chainable {
    return cy.findByTestId('not-found-page');
  },

  findDescription(): Cypress.Chainable {
    return cy.findByTestId('not-found-page-description');
  },

  findHomeButton(): Cypress.Chainable {
    return cy.findByTestId('home-page-button');
  },
};
