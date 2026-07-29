/* eslint-disable no-barrel-files/no-barrel-files */

import { modelServingSection } from '../pages/modelServing';
// Re-exports all api/models to allow tests to reference models.

// eslint-disable-next-line no-restricted-imports
export * from '@odh-dashboard/internal/api/models/index';

export const NIMAccountModel = {
  apiVersion: 'v1',
  apiGroup: 'nim.opendatahub.io',
  kind: 'Account',
  plural: 'accounts',
};

/**
 * Clicks the deployment status label to open the DeploymentStatusModal,
 * verifies the modal shows a "Ready" status, then closes it.
 * Retries with page reloads if the status element is not yet visible.
 */
export function verifyDeploymentStatusModal(): void {
  const maxAttempts = 5;
  let attempts = 0;

  function attempt(): void {
    if (attempts >= maxAttempts) {
      throw new Error('Failed to find and click the status label after 5 attempts');
    }

    modelServingSection.findStatusTooltip().then(($el) => {
      if ($el.length > 0 && $el.is(':visible')) {
        modelServingSection.findStatusTooltip().click({ force: true });
        cy.findByTestId('deployment-status-modal', { timeout: 10000 }).should('be.visible');
        cy.findByTestId('deployment-status-modal')
          .findByTestId('model-status-text')
          .should('include.text', 'Ready');
        cy.findByTestId('deployment-status-modal').find('button[aria-label="Close"]').click();
      } else {
        attempts++;
        cy.reload();
        attempt();
      }
    });
  }

  attempt();
}
