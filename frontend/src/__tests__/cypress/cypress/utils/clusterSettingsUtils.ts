import {
  modelServingSettings,
  pvcSizeSettings,
  cullerSettings,
  notebookTolerationSettings,
} from '~/__tests__/cypress/cypress/pages/clusterSettings';
import type { DashboardConfig, NotebookControllerConfig } from '~/__tests__/cypress/cypress/types';

/**
 * Validates the Model Serving Platform checkboxes display in the Cluster Settings.
 * @param dashboardConfig The Model Serving Platform configuration object.
 */
export const validateModelServingPlatforms = (dashboardConfig: DashboardConfig): void => {
  const isModelServingEnabled = dashboardConfig.dashboardConfig.disableModelServing;
  cy.log(`Value of isModelServingDisabled: ${String(isModelServingEnabled)}`);

  if (isModelServingEnabled) {
    modelServingSettings.findSinglePlatformCheckbox().should('not.exist');
    modelServingSettings.findMultiPlatformCheckbox().should('not.exist');
    cy.log('Model Serving is disabled, checkboxes should not be visible');
  } else {
    modelServingSettings.findSinglePlatformCheckbox().should('be.checked');
    modelServingSettings.findMultiPlatformCheckbox().should('be.checked');
    cy.log('Model Serving is enabled, checkboxes should be checked');
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
 * @param notebookControllerConfig The notebook controller configuration object.
 */
export const validateStopIdleNotebooks = (
  notebookControllerConfig: NotebookControllerConfig,
): void => {
  const isCullingEnabled = notebookControllerConfig.ENABLE_CULLING;
  cy.log(`Value of ENABLE_CULLING: ${isCullingEnabled}`);

  if (isCullingEnabled) {
    cullerSettings.findStopIdleNotebooks().should('exist');
    cy.log('Culling is enabled; Stop Idle Notebooks setting should exist in the UI.');
  } else {
    cullerSettings.findStopIdleNotebooks().should('not.exist');
    cy.log('Culling is disabled; Stop Idle Notebooks setting should not exist in the UI.');
  }
};

/**
 * Validates the Notebook Pod Tolerations displays in the Cluster Settings.
 * @param dashboardConfig The dashboard configuration object.
 */
export const validateNotebookPodTolerations = (dashboardConfig: DashboardConfig): void => {
  // Log the entire notebook controller settings for debugging
  cy.log(
    'Notebook Controller Settings:',
    JSON.stringify(
      {
        controllerEnabled: dashboardConfig.notebookController.enabled,
      },
      null,
      2,
    ),
  );

  // Determine if Notebook Pod Tolerations should appear
  const shouldShowTolerations = dashboardConfig.notebookController.enabled;

  if (shouldShowTolerations) {
    cy.log('Notebook Pod Tolerations should be visible.');
    notebookTolerationSettings
      .findNotebookPodTolerationsText()
      .scrollIntoView()
      .should('exist')
      .and('be.visible');
    cy.log('Notebook Pod Tolerations Text exists and is visible.');
  } else {
    cy.log('Notebook Pod Tolerations should not be visible.');
    cy.get('body').then(($body: JQuery<HTMLBodyElement>): void => {
      if ($body.text().includes('Notebook pod tolerations')) {
        throw new Error('Notebook pod tolerations text found when it should not be visible');
      }
    });
    cy.log('Notebook Pod Tolerations Text is not visible, as expected.');
  }
};
