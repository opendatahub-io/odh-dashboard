import { modelRegistry } from '#~/__tests__/cypress/cypress/pages/modelRegistry';

/**
 * Utility functions for Model Registry UI interactions
 */

/**
 * Clicks the appropriate register model button based on registry state
 * Handles both empty and populated registry states automatically
 * @param timeout Optional timeout for button interactions
 */
export const clickRegisterModelButton = (timeout?: number): Cypress.Chainable => {
  // Wait for either button to appear in DOM
  return cy
    .get('body')
    .should(() => {
      const body = Cypress.$('body');
      const hasEmptyButton =
        body.find(modelRegistry.getEmptyRegisterModelButtonSelector()).length > 0;
      const hasRegularButton = body.find(modelRegistry.getRegisterModelButtonSelector()).length > 0;

      void expect(hasEmptyButton || hasRegularButton).to.be.true;
    })
    .then(($body) => {
      if ($body.find(modelRegistry.getEmptyRegisterModelButtonSelector()).length > 0) {
        // Registry is empty, use empty state button
        cy.log('Found empty registry button, clicking it');
        return modelRegistry.findEmptyRegisterModelButton(timeout).click();
      }
      // Registry has models, use regular register button
      cy.log('Empty registry button not found, using regular register button');
      return modelRegistry.findRegisterModelButton(timeout).click();
    });
};
