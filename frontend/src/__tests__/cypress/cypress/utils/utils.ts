export const getByDataTestId = (testId: string): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.get(`[data-testid="${testId}"]`);
