import { modelRegistry } from '../pages/modelRegistry';

/**
 * Utility functions for Model Registry UI interactions
 */

/**
 * After navigation to Register model, wait for the form shell (avoids racing tabbed layout / async load).
 */
const assertRegisterModelRouteAndForm = (timeout?: number) => {
  const t = timeout ?? Cypress.config('defaultCommandTimeout');
  cy.url({ timeout: t }).should('include', '/register/model');
  cy.findByTestId('app-page-title').should('contain', 'Register model');
  cy.get('#model-name', { timeout: t }).should('be.visible');
};

/**
 * Clicks the appropriate register model button based on registry state
 * Handles both empty and populated registry states automatically
 * @param timeout Optional timeout for button interactions
 */
export const clickRegisterModelButton = (timeout?: number): Cypress.Chainable => {
  const emptySel = modelRegistry.getEmptyRegisterModelButtonSelector();
  const regularSel = modelRegistry.getRegisterModelButtonSelector();
  const t = timeout;

  // Prefer whichever CTA is visible and enabled (empty-state and toolbar CTAs may both exist in DOM).
  cy.get('body').then(($body) => {
    const $empty = $body.find(emptySel).filter(':visible').filter(':enabled');
    const $regular = $body.find(regularSel).filter(':visible').filter(':enabled');
    if ($empty.length > 0) {
      cy.wrap($empty.first()).click();
    } else if ($regular.length > 0) {
      cy.wrap($regular.first()).click();
    } else {
      cy.get(`${emptySel}, ${regularSel}`, { timeout: t })
        .filter(':visible')
        .filter(':enabled')
        .first()
        .click();
    }
  });

  assertRegisterModelRouteAndForm(t);
  return cy.wrap(null);
};
