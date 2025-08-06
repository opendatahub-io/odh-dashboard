import { Card } from '#~/__tests__/cypress/cypress/pages/components/Card';

export class NIMCard extends Card {
  constructor() {
    super('nim');
  }

  getNIMCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Try multiple selectors for NIM card
    // 1. Original card selector
    return cy.get('[data-testid="card nvidia-nim"]').then(($card) => {
      if ($card.length > 0) {
        return cy.wrap($card);
      }
      // 2. If not found, try radio button selector (for RHOAI deployments)
      return cy.get('#nvidia-nim-selectable-card-id').then(($radio) => {
        if ($radio.length > 0) {
          return cy.wrap($radio);
        }
        // 3. If still not found, try aria-labelledby selector
        return cy.get('[aria-labelledby="nvidia-nim"]').then(($aria) => {
          if ($aria.length > 0) {
            return cy.wrap($aria);
          }
          throw new Error('NIM card not found with any available selector');
        });
      });
    });
  }

  isNIMCardAvailable(): Cypress.Chainable<boolean> {
    // Use a more robust approach that doesn't throw errors when elements aren't found
    return cy.get('body').then(($body) => {
      // Try each selector using jQuery find() which doesn't throw errors
      let found = false;
      let selector = '';

      // 1. Try [data-testid="card nvidia-nim"]
      const cardElements = $body.find('[data-testid="card nvidia-nim"]');
      if (cardElements.length > 0) {
        found = true;
        selector = '[data-testid="card nvidia-nim"]';
        cy.log(`🔍 NIM card detection: found ${cardElements.length} elements with ${selector}`);
        cy.wrap(cardElements).scrollIntoView();
      }

      // 2. If not found, try #nvidia-nim-selectable-card-id
      if (!found) {
        const radioElements = $body.find('#nvidia-nim-selectable-card-id');
        if (radioElements.length > 0) {
          found = true;
          selector = '#nvidia-nim-selectable-card-id';
          cy.log(`🔍 NIM card detection: found ${radioElements.length} elements with ${selector}`);
          cy.wrap(radioElements).scrollIntoView();
        }
      }

      // 3. If not found, try [aria-labelledby="nvidia-nim"]
      if (!found) {
        const ariaElements = $body.find('[aria-labelledby="nvidia-nim"]');
        if (ariaElements.length > 0) {
          found = true;
          selector = '[aria-labelledby="nvidia-nim"]';
          cy.log(`🔍 NIM card detection: found ${ariaElements.length} elements with ${selector}`);
          cy.wrap(ariaElements).scrollIntoView();
        }
      }

      if (!found) {
        cy.log(`🔍 NIM card detection: found 0 elements with any selector`);
      }

      return cy.wrap(found);
    });
  }

  getEnableNIMButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('enable-app');
  }

  isEnableButtonAvailable(): Cypress.Chainable<boolean> {
    return cy.get('body').then(($body) => {
      const enableButtons = $body.find('[data-testid="enable-app"]');
      const count = enableButtons.length;

      // Log the detection result before returning
      cy.log(`🔍 Enable button detection: found ${count} elements with [data-testid="enable-app"]`);

      // Return the result without any cy commands after this point
      return count > 0;
    });
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
