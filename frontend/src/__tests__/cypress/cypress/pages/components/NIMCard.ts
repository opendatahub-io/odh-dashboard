import { Card } from '#~/__tests__/cypress/cypress/pages/components/Card';

export class NIMCard extends Card {
  constructor() {
    super('nim');
  }

  getNIMCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Use the proven reliable selector - KISS principle
    return cy.findByTestId('card nvidia-nim');
  }

  isNIMCardAvailable(): Cypress.Chainable<boolean> {
    return cy.get('body').then(($body) => {
      // Use the proven reliable selector - KISS principle
      const selector = '[data-testid="card nvidia-nim"]';
      const elements = $body.find(selector);
      
      if (elements.length > 0) {
        cy.log(`✅ NIM card found using selector: ${selector}`);
        return true;
      }
      
      cy.log(`❌ NIM card not found with selector: ${selector}`);
      return false;
    });
  }

  getEnableNIMButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('enable-app');
  }

  getNGCAPIKey(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Use a more generic selector that looks for password input field
    // This should be more resilient to data-id changes
    return cy.get('input[type="password"]');
  }

  getNIMSubmit(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('enable-app-submit');
  }

  getProgressTitle(options: object = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('.odh-enable-modal__progress-title', options);
  }
}

export const nimCard = new NIMCard();
