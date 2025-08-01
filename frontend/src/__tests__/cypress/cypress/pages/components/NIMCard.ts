import { Card } from '#~/__tests__/cypress/cypress/pages/components/Card';

export class NIMCard extends Card {
  constructor() {
    super('nim');
  }

  getNIMCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Try the specific input selector first, then fall back to the original
    return cy.get('input[id="nvidia-nim-selectable-card-id"]').then(($element) => {
      if ($element.length > 0) {
        cy.log('✅ NIM card found using input selector');
        return $element;
      } else {
        cy.log('🔄 Falling back to original testid selector');
        return cy.findByTestId('card nvidia-nim');
      }
    });
  }

  isNIMCardAvailable(): Cypress.Chainable<boolean> {
    return cy.get('body').then(($body) => {
      // Try multiple selectors to find the NIM card
      const selectors = [
        '[data-testid="card nvidia-nim"]',
        '#nvidia-nim-selectable-card-id',
        'input[id="nvidia-nim-selectable-card-id"]',
        '[data-testid*="nvidia-nim"]',
        '[id*="nvidia-nim"]'
      ];
      
      for (const selector of selectors) {
        if ($body.find(selector).length > 0) {
          cy.log(`✅ NIM card found using selector: ${selector}`);
          return true;
        }
      }
      
      cy.log('❌ NIM card not found with any selector');
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
