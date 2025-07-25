import { clusterStorage } from '#~/__tests__/cypress/cypress/pages/clusterStorage';

/**
 * Find the "Add cluster storage" button in the DSP details Cluster Storage tab.
 * It can be in two different positions:
 * 1. When there are no Cluster Storage
 * 2. When there are already at least 1 Cluster Storage
 *
 */
export const findAddClusterStorageButton = (): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="cluster-storage-button"]').length > 0) {
      return clusterStorage.findCreateButton();
    }
    return clusterStorage.findCreateButtonFromActions();
  });
