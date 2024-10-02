export function findNimModelDeployButton(): Cypress.Chainable<JQuery> {
  return findNimModelServingPlatformCard().findByTestId('nim-serving-deploy-button');
}

export function findNimModelServingPlatformCard(): Cypress.Chainable<JQuery> {
  return cy.findByTestId('nvidia-nim-model-serving-platform-card');
}

export function findServingPlatformLabel(): Cypress.Chainable<JQuery> {
  return cy.findByTestId('serving-platform-label');
}
