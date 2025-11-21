import { clusterStorage } from '#~/__tests__/cypress/cypress/pages/clusterStorage';

/**
 * Find the "Add cluster storage" button in the Pipelines details Cluster Storage tab.
 * It can be in two different positions:
 * 1. When there are no Cluster Storage (cluster-storage-button)
 * 2. When there are already at least 1 Cluster Storage (actions-cluster-storage-button)
 *
 * This function waits for the page to fully load before checking which button exists.
 */
export const findAddClusterStorageButton = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  // First, wait for either button to exist (page fully loaded)
  cy.get('[data-testid="cluster-storage-button"], [data-testid="actions-cluster-storage-button"]', {
    timeout: 10000,
  }).should('exist');

  // Then check which one is present and return the appropriate element
  return cy.get('body').then(($body) => {
    if ($body.find('[data-testid="cluster-storage-button"]').length > 0) {
      return clusterStorage.findCreateButton();
    }
    return clusterStorage.findCreateButtonFromActions();
  });
};
