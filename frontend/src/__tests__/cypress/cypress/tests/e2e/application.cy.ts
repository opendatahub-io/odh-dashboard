describe('application', { testIsolation: false }, () => {
  it('should login and load page', () => {
    cy.visitWithLogin('/');
    cy.findByRole('banner', { name: 'page masthead' }).findByRole('button', {
      name: Cypress.env('LOGIN_USERNAME'),
    });
  });
});
