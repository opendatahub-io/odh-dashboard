import { Card } from '#~/__tests__/cypress/cypress/pages/components/Card';

export class NIMCard extends Card {
  constructor() {
    super('nim');
  }

  getNIMCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Try multiple selectors to find the NIM card
    const selectors = [
      'input[id="nvidia-nim-selectable-card-id"]',
      '#nvidia-nim-selectable-card-id',
      '[data-testid="card nvidia-nim"]',
      '[data-testid*="nvidia-nim"]',
      '[id*="nvidia-nim"]',
      '[data-testid*="nim"]',
      '[id*="nim"]',
      '[class*="nim"]',
      '[aria-labelledby*="nim"]'
    ];
    
    cy.log(`🔍 Trying to get NIM card with ${selectors.length} different selectors...`);
    
    // Try each selector in order
    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      cy.log(`🔍 Trying selector ${i + 1}/${selectors.length}: ${selector}`);
      
      return cy.get(selector, { timeout: 5000 }).then(($element) => {
        if ($element.length > 0) {
          cy.log(`✅ NIM card found using selector: ${selector}`);
          cy.log(`📊 Found ${$element.length} elements with this selector`);
          return $element;
        } else {
          cy.log(`❌ Selector failed: ${selector}`);
          // If this is the last selector, throw an error
          if (i === selectors.length - 1) {
            throw new Error(`NIM card not found with any selector. Tried: ${selectors.join(', ')}`);
          }
          // Otherwise, continue to next selector
          return cy.get(selectors[i + 1], { timeout: 5000 });
        }
      }).catch(() => {
        // If this selector fails, try the next one
        if (i < selectors.length - 1) {
          return cy.get(selectors[i + 1], { timeout: 5000 });
        } else {
          throw new Error(`NIM card not found with any selector. Tried: ${selectors.join(', ')}`);
        }
      });
    }
    
    // Fallback to original testid selector
    cy.log('🔄 Falling back to original testid selector');
    return cy.findByTestId('card nvidia-nim');
  }

  isNIMCardAvailable(): Cypress.Chainable<boolean> {
    return cy.get('body').then(($body) => {
      // Try multiple selectors to find the NIM card
      const selectors = [
        '[data-testid="card nvidia-nim"]',
        '#nvidia-nim-selectable-card-id',
        'input[id="nvidia-nim-selectable-card-id"]',
        '[data-testid*="nvidia-nim"]',
        '[id*="nvidia-nim"]',
        // Additional selectors for different possible structures
        '[data-testid*="nim"]',
        '[id*="nim"]',
        '[class*="nim"]',
        '[aria-labelledby*="nim"]',
        '[for*="nim"]',
        // Look for any element containing "NVIDIA NIM" text
        ':contains("NVIDIA NIM")',
        ':contains("NIM")'
      ];
      
      cy.log(`🔍 Checking for NIM card with ${selectors.length} different selectors...`);
      
      for (const selector of selectors) {
        const elements = $body.find(selector);
        if (elements.length > 0) {
          cy.log(`✅ NIM card found using selector: ${selector}`);
          cy.log(`📊 Found ${elements.length} elements with this selector`);
          // Log the first element's details for debugging
          const firstElement = elements.first();
          cy.log(`📋 First element: tagName=${firstElement.prop('tagName')}, id=${firstElement.attr('id')}, class=${firstElement.attr('class')}`);
          return true;
        }
      }
      
      // If no specific selectors work, try to find any element with NIM-related text
      const nimTextElements = $body.find(':contains("NVIDIA NIM"), :contains("NIM")');
      if (nimTextElements.length > 0) {
        cy.log(`🔍 Found ${nimTextElements.length} elements containing NIM text`);
        cy.log(`📋 First NIM text element: ${nimTextElements.first().text().substring(0, 100)}`);
        return true;
      }
      
      cy.log('❌ NIM card not found with any selector');
      cy.log('🔍 Available elements on page:');
      $body.find('[data-testid], [id], [class*="card"]').each((index, element) => {
        if (index < 10) { // Limit to first 10 elements
          const $el = Cypress.$(element);
          cy.log(`  - ${$el.prop('tagName')}: id="${$el.attr('id')}", class="${$el.attr('class')}", data-testid="${$el.attr('data-testid')}"`);
        }
      });
      
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
