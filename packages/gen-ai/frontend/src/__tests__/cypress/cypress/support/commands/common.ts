/**
 * Common utility commands for Chatbot tests
 */
import { clearGenAiNamespacePersistence } from '~/__tests__/cypress/cypress/support/helpers/namespacePersistence';

export const visitApp = (): void => {
  cy.visit('/', { onBeforeLoad: clearGenAiNamespacePersistence });
};

export const checkAppLoaded = (): void => {
  cy.get('body').should('be.visible');
};

// Utility function to wait for page load
export const waitForPageLoad = (timeout = 30000): void => {
  cy.get('body', { timeout }).should('be.visible');
};
