import type { DashboardConfig } from '../types';
import { generalSettingsPage } from '../pages/modelDeploymentSettings/generalSettings';

/**
 * Validates the visibility and state of the Model Serving Platform switch
 * on the Model deployment settings General settings tab, based on the provided
 * dashboard configuration.
 *
 * These controls used to live on the Cluster Settings page but moved to the
 * General settings tab, so this navigates to that tab before asserting.
 *
 * This function checks whether the Model Serving feature is enabled or disabled,
 * and subsequently verifies the state of the Single-Platform switch.
 *
 * - If Model Serving is disabled, the switch should not be visible.
 * - If Model Serving is enabled:
 *   - The Single-Platform switch will be checked if KServe is enabled;
 *     otherwise, it will not be checked.
 *
 * @param dashboardConfig The Model Serving Platform configuration object containing
 *                        settings related to model serving and KServe.
 */
export const validateModelServingPlatforms = (dashboardConfig: DashboardConfig): void => {
  /* eslint-disable @typescript-eslint/no-unnecessary-condition */
  const isModelServingEnabled = dashboardConfig.dashboardConfig?.disableModelServing;
  const isKServeEnabled = dashboardConfig.dashboardConfig?.disableKServe;
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */

  cy.log(`Value of isModelServingEnabled: ${String(isModelServingEnabled)}`);
  cy.log(`Value of isKServeEnabled: ${String(isKServeEnabled)}`);

  generalSettingsPage.visit();

  if (isModelServingEnabled) {
    generalSettingsPage.findSinglePlatformSwitch().should('not.exist');
    cy.log('Model Serving is disabled, the switch should not be visible');
  } else if (isKServeEnabled) {
    generalSettingsPage.findSinglePlatformSwitch().should('not.be.checked');
    cy.log('KServe is disabled, the Single-Platform switch should not be checked');
  } else {
    generalSettingsPage.findSinglePlatformSwitch().should('be.checked');
    cy.log('KServe is enabled, the Single-Platform switch should be checked');
  }
};
