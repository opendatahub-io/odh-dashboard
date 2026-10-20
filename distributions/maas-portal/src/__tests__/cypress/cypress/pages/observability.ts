export const observability = {
  findNoProjects: (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.findByTestId('portal-no-projects'),
  findUnavailable: (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.findByTestId('portal-observability-unavailable'),
  findAccessDenied: (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.findByTestId('portal-observability-access-denied'),
  findProjectsAccessDenied: (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.findByTestId('portal-observability-projects-access-denied'),
};
