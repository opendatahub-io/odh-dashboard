import { Card } from '~/__tests__/cypress/cypress/pages/components/Card';

export class NIMCard extends Card {
  constructor() {
    super('nim');
  }

  getNIMCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('card nvidia-nim');
  }

  getEnableNIMButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('enable-app');
  }

  getNGCAPIKey(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-id="NVIDIA AI Enterprise license key"]');
  }

  getNIMSubmit(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('enable-app-submit');
  }

  waitForValidationToComplete(): void {
    cy.get('.odh-enable-modal__progress-title').should('contain', 'Validating your entries');
    cy.get('.odh-enable-modal__progress-title', { timeout: 120000 }).should('not.exist');
  }

  disabledButtonShouldNotExist(): void {
    this.getNIMCard().within(() => {
      cy.contains('button', 'Disabled', { timeout: 60000 }).should('not.exist');
    });
  }
}

export const nimCard = new NIMCard();
