/**
 * Common utility commands for Chatbot tests
 */

export const visitApp = (): void => {
  cy.visit('/');
};

export const checkAppLoaded = (): void => {
  cy.get('body').should('be.visible');
};

// Utility function to wait for page load
export const waitForPageLoad = (timeout = 30000): void => {
  cy.get('body', { timeout }).should('be.visible');
};
