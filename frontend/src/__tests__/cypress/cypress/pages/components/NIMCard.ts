import { Card } from '#~/__tests__/cypress/cypress/pages/components/Card';

export class NIMCard extends Card {
  constructor() {
    super('nim');
  }

  getNIMCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Find the element containing "NVIDIA NIM" - more general and resilient
    return cy.contains('NVIDIA NIM').closest('[data-testid*="card"], [class*="card"], [role="radio"]');
  }

  isNIMCardAvailable(): Cypress.Chainable<boolean> {
    return cy.get('body').then(($body) => {
      // Look for any element containing "NVIDIA NIM" - more general and resilient
      const nimElements = $body.find(':contains("NVIDIA NIM")');
      
      if (nimElements.length > 0) {
        cy.log(`✅ NIM card found - ${nimElements.length} elements contain "NVIDIA NIM"`);
        return true;
      }
      
      cy.log(`❌ NIM card not found - no elements contain "NVIDIA NIM"`);
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
