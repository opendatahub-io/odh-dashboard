import { modelServingSettings, pvcSizeSettings, cullerSettings } from '../pages/clusterSettings';
import type { DashboardConfig, NotebookControllerCullerConfig } from '../types';

/**
 * Validates the visibility and state of Model Serving Platform checkboxes
 * in the Cluster Settings based on the provided dashboard configuration.
 *
 * This function checks whether the Model Serving feature is enabled or disabled,
 * and subsequently verifies the state of the Multi-Platform and Single-Platform
 * checkboxes based on their respective enable/disable flags.
 *
 * - If Model Serving is disabled, both checkboxes should not be visible.
 * - If Model Serving is enabled:
 *   - The Multi-Platform Checkbox will be checked if Model Mesh is enabled;
 *     otherwise, it will not be checked.
 *   - The Single-Platform Checkbox will be checked if KServe is enabled;
 *     otherwise, it will not be checked.
 *
 * @param dashboardConfig The Model Serving Platform configuration object containing
 *                        settings related to model serving, model mesh, and KServe.
 */
export const validateModelServingPlatforms = (dashboardConfig: DashboardConfig): void => {
  /* eslint-disable @typescript-eslint/no-unnecessary-condition */
  const isModelServingEnabled = dashboardConfig.dashboardConfig?.disableModelServing;
  const isKServeEnabled = dashboardConfig.dashboardConfig?.disableKServe;
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */

  cy.log(`Value of isModelServingEnabled: ${String(isModelServingEnabled)}`);
  cy.log(`Value of isKServeEnabled: ${String(isKServeEnabled)}`);

  if (isModelServingEnabled) {
    modelServingSettings.findSinglePlatformCheckbox().should('not.exist');
    cy.log('Model Serving is disabled, checkboxes should not be visible');
  } else if (isKServeEnabled) {
    modelServingSettings.findSinglePlatformCheckbox().should('not.be.checked');
    cy.log('Single-Platform Checkbox is disabled, it should not be checked');
  } else {
    modelServingSettings.findSinglePlatformCheckbox().should('be.checked');
    cy.log('Single-Platform Checkbox is enabled, it should be checked');
  }
};

/**
 * Validates the PVC Size displays in the Cluster Settings.
 * @param dashboardConfig The PVC Size configuration object.
 */
export const validatePVCSize = (dashboardConfig: DashboardConfig): void => {
  const { pvcSize } = dashboardConfig.notebookController;
  cy.log(`Value of PVC Size: ${String(pvcSize)}`);

  if (pvcSize) {
    const numericPvcSize = parseInt(pvcSize);
    if (!Number.isNaN(numericPvcSize)) {
      pvcSizeSettings
        .findInput()
        .should('exist')
        .and('be.visible')
        .and('have.value', numericPvcSize.toString());
      cy.log(`PVC size is set and visible: ${numericPvcSize}`);
    } else {
      cy.log(`Warning: PVC size '${pvcSize}' is not a valid number`);
    }
  } else {
    pvcSizeSettings.findInput().should('not.exist');
    cy.log('PVC size setting is not available, input should not exist');
  }
};

/**
 * Validates the Stop Idle Notebooks displays in the Cluster Settings.
 * @param notebookControllerCullerConfig The notebook controller culler configuration object or error message.
 */
export const validateStopIdleNotebooks = (
  notebookControllerCullerConfig: NotebookControllerCullerConfig | string,
): void => {
  if (typeof notebookControllerCullerConfig === 'string') {
    cy.log('Culler config not found or error occurred:', notebookControllerCullerConfig);
    cullerSettings.findUnlimitedOption().should('be.checked');
    cullerSettings.findLimitedOption().should('not.be.checked');
    cy.log('Do not stop idle notebooks option should be checked when culler config is not found');
  } else {
    const isCullingEnabled = 'ENABLE_CULLING' in notebookControllerCullerConfig;
    cy.log(`Value of ENABLE_CULLING: ${isCullingEnabled}`);

    if (isCullingEnabled) {
      cullerSettings.findLimitedOption().should('be.checked');
      cullerSettings.findUnlimitedOption().should('not.be.checked');
      cy.log('Stop idle notebooks after should be checked when culling is enabled');
    }
  }
};
