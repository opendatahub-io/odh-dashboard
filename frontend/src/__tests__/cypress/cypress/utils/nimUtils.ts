export function findNimModelDeployButton(): Cypress.Chainable<JQuery> {
  return findNimModelServingPlatformCard().findByTestId('nim-serving-deploy-button');
}

export function findNimModelServingPlatformCard(): Cypress.Chainable<JQuery> {
  return cy.findByTestId('nvidia-nim-model-serving-platform-card');
}

export function findServingPlatformLabel(): Cypress.Chainable<JQuery> {
  return cy.findByTestId('serving-platform-label');
}

export const modalDialogTitle = 'Deploy model with NVIDIA NIM';
export function validateNvidiaNimModel(
  deployButtonElement: Cypress.Chainable<JQuery<HTMLElement>>,
): void {
  deployButtonElement.click();
  cy.contains(modalDialogTitle);
  cy.contains('Configure properties for deploying your model using an NVIDIA NIM.');

  //find the form label Project with value as the Test Project
  cy.contains('label', 'Project').parent().next().find('p').should('have.text', 'Test Project');

  //close the model window
  cy.get('div[role="dialog"]').get('button[aria-label="Close"]').click();

  // now the nvidia nim window should not be visible.
  cy.contains(modalDialogTitle).should('not.exist');

  deployButtonElement.click();
  //validate model submit button is disabled without entering form data
  cy.findByTestId('modal-submit-button').should('be.disabled');
  //validate nim modal cancel button
  cy.findByTestId('modal-cancel-button').click();
  cy.contains(modalDialogTitle).should('not.exist');
}

export function validateNimModelsTable(): void {
  // Table is visible and has 2 rows (2nd is the hidden expandable row)
  cy.get('[data-testid="kserve-inference-service-table"]')
    .find('tbody')
    .find('tr')
    .should('have.length', 2);

  // First row matches the NIM inference service details
  cy.get('[style="display: block;"] > :nth-child(1)').should('have.text', 'Test Name');
  cy.get('[data-label="Serving Runtime"]').should('have.text', 'NVIDIA NIM');
  cy.get('[data-testid="internal-service-button"]').should('have.text', 'Internal Service');
  // Validate Internal Service tooltip and close it
  cy.get('[data-testid="internal-service-button"]').click();
  cy.get('.pf-v5-c-popover__title-text').should(
    'have.text',
    'Internal Service can be accessed inside the cluster',
  );
  cy.get('.pf-v5-c-popover__close > .pf-v5-c-button > .pf-v5-svg > path').click();
  // Open toggle to validate Model details
  cy.get('.pf-v5-c-table__toggle-icon').click();
  cy.get(
    ':nth-child(1) > .pf-v5-c-description-list > .pf-v5-c-description-list__group > .pf-v5-c-description-list__description > .pf-v5-c-description-list__text',
  ).should('have.text', 'arctic-embed-l');
  cy.get(
    ':nth-child(2) > .pf-v5-c-description-list > :nth-child(1) > .pf-v5-c-description-list__description > .pf-v5-c-description-list__text',
  ).should('have.text', '1');
  cy.get('.pf-v5-c-list > :nth-child(1)').should('have.text', 'Small');
  cy.get('.pf-v5-c-list > :nth-child(2)').should('have.text', '1 CPUs, 4Gi Memory requested');
  cy.get('.pf-v5-c-list > :nth-child(3)').should('have.text', '2 CPUs, 8Gi Memory limit');
  cy.get(
    ':nth-child(3) > .pf-v5-c-description-list__description > .pf-v5-c-description-list__text',
  ).should('have.text', 'No accelerator selected');
  cy.get('.pf-v5-c-table__toggle-icon').click();
}

export function validateNimOverviewModelsTable(): void {
  // Card is visible
  cy.get(
    '.pf-v5-c-card__header-main > .pf-v5-l-flex > :nth-child(2) > .pf-v5-c-content > h3 > b',
  ).should('be.visible');
  cy.get(
    '.pf-v5-l-gallery > :nth-child(1) > .pf-v5-c-card > .pf-v5-c-card__header > .pf-v5-c-card__header-main > .pf-v5-l-flex > :nth-child(1)',
  ).should('be.visible');
  // Validate card details
  cy.get(':nth-child(2) > [style="display: block;"] > :nth-child(1)').should(
    'have.text',
    'Test Name',
  );
  cy.get('dt').should('have.text', 'Serving runtime');
  cy.get('dd').should('have.text', 'NVIDIA NIM');
  cy.get('[data-testid="internal-service-button"]').should('have.text', 'Internal Service');
  cy.get('[data-testid="internal-service-button"]').click();
  cy.get('.pf-v5-c-popover__title-text').should(
    'have.text',
    'Internal Service can be accessed inside the cluster',
  );
  // Opens the Models table
  cy.get('.pf-m-gap-md > :nth-child(2) > .pf-v5-c-button').click();
}

export function validateNimInmferenceModelsTable(): void {
  // Table is visible and has 1 row
  cy.get('[data-testid="inference-service-table"]')
    .find('tbody')
    .find('tr')
    .should('have.length', 1);
  // First row matches the NIM inference service details
  cy.get('[style="display: block;"] > :nth-child(1)').should('have.text', 'Test Name');
  cy.get('[data-label="Project"]').should('contains.text', 'Test Project');
  cy.get(
    '[data-label="Project"] > .pf-v5-c-label > .pf-v5-c-label__content > .pf-v5-c-label__text',
  ).should('have.text', 'Single-model serving enabled');
  cy.get('[data-label="Serving Runtime"]').should('have.text', 'NVIDIA NIM');
  // Validate Internal Service tooltip and close it
  cy.get('[data-testid="internal-service-button"]').should('have.text', 'Internal Service');
  cy.get('[data-testid="internal-service-button"]').click();
  cy.get('.pf-v5-c-popover__title-text').should(
    'have.text',
    'Internal Service can be accessed inside the cluster',
  );
  cy.get('.pf-v5-c-popover__close > .pf-v5-c-button > .pf-v5-svg > path').click();
  cy.get(
    '[data-label="API protocol"] > .pf-v5-c-label > .pf-v5-c-label__content > .pf-v5-c-label__text',
  ).should('have.text', 'REST');
  cy.get('[data-testid="status-tooltip"] > .pf-v5-c-icon__content > .pf-v5-svg > path').should(
    'be.visible',
  );
}
