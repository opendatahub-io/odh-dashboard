export function findNimModelDeployButton(): Cypress.Chainable<JQuery> {
  return findNimModelServingPlatformCard().findByTestId('nim-serving-deploy-button');
}

export function findNimModelServingPlatformCard(): Cypress.Chainable<JQuery> {
  return cy.findByTestId('nvidia-nim-model-serving-platform-card');
}

export function findServingPlatformLabel(): Cypress.Chainable<JQuery> {
  return cy.findByTestId('serving-platform-label');
}

export function validateNvidiaNimModel(deployButtonElement): void {
  deployButtonElement.click();
  cy.contains('Deploy model with NVIDIA NIM');
  cy.contains('Configure properties for deploying your model using an NVIDIA NIM.');

  //find the form label Project with value as the Test Project
  cy.contains('label', 'Project').parent().next().find('p').should('have.text', 'Test Project');

  //close the model window
  cy.get('div[role="dialog"]').get('button[aria-label="Close"]').click();

  // now the nvidia nim window should not be visible.
  cy.contains('Deploy model with NVIDIA NIM').should('not.exist');

  deployButtonElement.click();
  //validate model submit button is disabled without entering form data
  cy.findByTestId('modal-submit-button').should('be.disabled');
  //validate nim modal cancel button
  cy.findByTestId('modal-cancel-button').click();
  cy.contains('Deploy model with NVIDIA NIM').should('not.exist');
}
