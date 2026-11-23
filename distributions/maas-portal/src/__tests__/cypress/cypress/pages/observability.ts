export const observability = {
  findTabs: (): Cypress.Chainable<JQuery<HTMLElement>> => cy.findAllByRole('tab'),
  findTab: (name: string): Cypress.Chainable<JQuery<HTMLElement>> => cy.findByRole('tab', { name }),
  findEmptyState: (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.findByText('No usage dashboards were found.'),
  findUnavailable: (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.findByTestId('portal-observability-unavailable'),
  findAccessDenied: (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.findByTestId('portal-observability-access-denied'),
};
