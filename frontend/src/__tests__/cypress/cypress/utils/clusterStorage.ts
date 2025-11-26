import { clusterStorage } from '#~/__tests__/cypress/cypress/pages/clusterStorage';

/**
 * Find the "Add cluster storage" button in the Pipelines details Cluster Storage tab.
 * It can be in two different positions:
 * 1. When there are no Cluster Storage - uses clusterStorage.findCreateButton()
 * 2. When there are already at least 1 Cluster Storage - uses clusterStorage.findCreateButtonFromActions()
 *
 * This function determines which button is visible and returns it using page object methods.
 */
export const findAddClusterStorageButton = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  // Check which button exists in the DOM by querying both page object methods
  return cy.get('body').then(() => {
    // Use cy.then to check if the primary button exists and is visible
    return cy.document().then((doc) => {
      const primaryButton = doc.querySelector('[data-testid="cluster-storage-button"]');
      const actionsButton = doc.querySelector('[data-testid="actions-cluster-storage-button"]');

      // If primary button exists and is visible, use it
      if (primaryButton && Cypress.$(primaryButton).is(':visible')) {
        return clusterStorage.findCreateButton();
      }
      // If actions button exists and is visible, use it
      if (actionsButton && Cypress.$(actionsButton).is(':visible')) {
        return clusterStorage.findCreateButtonFromActions();
      }
      // Fallback: try primary button (will fail appropriately if neither exists)
      return clusterStorage.findCreateButton();
    });
  });
};
