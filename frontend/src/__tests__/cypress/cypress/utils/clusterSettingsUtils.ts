import {
  modelServingSettings,
  pvcSizeSettings,
  cullerSettings,
  notebookTolerationSettings,
  clusterSettings,
} from '#~/__tests__/cypress/cypress/pages/clusterSettings';
import type {
  DashboardConfig,
  NotebookControllerCullerConfig,
} from '#~/__tests__/cypress/cypress/types';

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
  const isModelServingEnabled = dashboardConfig.dashboardConfig.disableModelServing;
  const isModelMeshEnabled = dashboardConfig.dashboardConfig.disableModelMesh;
  const isKServeEnabled = dashboardConfig.dashboardConfig.disableKServe;

  cy.log(`Value of isModelServingEnabled: ${String(isModelServingEnabled)}`);
  cy.log(`Value of isModelMeshEnabled: ${String(isModelMeshEnabled)}`);
  cy.log(`Value of isKServeEnabled: ${String(isKServeEnabled)}`);

  if (isModelServingEnabled) {
    modelServingSettings.findSinglePlatformCheckbox().should('not.exist');
    modelServingSettings.findMultiPlatformCheckbox().should('not.exist');
    cy.log('Model Serving is disabled, checkboxes should not be visible');
  } else {
    // Validate Multi-Platform Checkbox based on disableModelMesh
    if (isModelMeshEnabled) {
      modelServingSettings.findMultiPlatformCheckbox().should('not.be.checked');
      cy.log('Multi-Platform Checkbox is disabled, it should not be checked');
    } else {
      modelServingSettings.findMultiPlatformCheckbox().should('be.checked');
      cy.log('Multi-Platform Checkbox is enabled, it should be checked');
    }

    // Validate Single-Platform Checkbox based on disableKServe
    if (isKServeEnabled) {
      modelServingSettings.findSinglePlatformCheckbox().should('not.be.checked');
      cy.log('Single-Platform Checkbox is disabled, it should not be checked');
    } else {
      modelServingSettings.findSinglePlatformCheckbox().should('be.checked');
      cy.log('Single-Platform Checkbox is enabled, it should be checked');
    }
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
/**
 * Handles the toleration settings in the notebook configuration.
 * This function checks if the toleration checkbox is currently ticked.
 * If it is not ticked, it will tick the checkbox.
 * Then, it clears the toleration input field and types the specified toleration value.
 * Finally, it submits the form to save the settings.
 *
 * @param {string} toleration - The toleration value to be set in the input field.
 */
export function handleTolerationSettings(toleration: string): void {
  notebookTolerationSettings.findEnabledCheckbox().then(($checkbox: JQuery<HTMLElement>) => {
    const isChecked = $checkbox.is(':checked');
    if (!isChecked) {
      cy.wrap($checkbox).click();
      cy.wrap($checkbox).should('be.checked');
    }
  });

  cy.then(() => {
    notebookTolerationSettings.findKeyInput().clear().type(toleration);
  });

  cy.then(() => {
    clusterSettings.findSubmitButton().click();
  });
}

/**
 * Saves the current state of toleration settings (checkbox and input value).
 * This function captures whether the checkbox is checked and the current value of the input field.
 *
 * @returns {Cypress.Chainable<{ isChecked: boolean, tolerationValue: string }>} The saved state of the settings.
 */
export function saveTolerationSettings(): Cypress.Chainable<{
  isChecked: boolean;
  tolerationValue: string;
}> {
  return cy.wrap(null).then(() => {
    return notebookTolerationSettings
      .findEnabledCheckbox()
      .then(($checkbox: JQuery<HTMLElement>) => {
        const isChecked = $checkbox.is(':checked');
        return notebookTolerationSettings
          .findKeyInput()
          .invoke('val')
          .then((tolerationValue) => {
            return { isChecked, tolerationValue: tolerationValue as string };
          });
      });
  });
}

/**
 * Restores the toleration settings to a previously saved state.
 * This function restores both the checkbox state and input field value to their original settings.
 *
 * @param {{ isChecked: boolean, tolerationValue: string }} savedState - The saved state to restore.
 */
export function restoreTolerationSettings(savedState: {
  isChecked: boolean;
  tolerationValue: string;
}): void {
  // Define the retry logic
  const retryRestoreSettings = () => {
    // Ensure the checkbox is checked first
    notebookTolerationSettings.findEnabledCheckbox().then(($checkbox: JQuery<HTMLElement>) => {
      if (!$checkbox.is(':checked')) {
        cy.wrap($checkbox).click(); // Check the checkbox if it's not already checked
      }
    });

    // Restore input field value
    notebookTolerationSettings.findKeyInput().clear().type(savedState.tolerationValue);

    // Restore checkbox state based on savedState
    notebookTolerationSettings.findEnabledCheckbox().then(($checkbox: JQuery<HTMLElement>) => {
      const currentChecked = $checkbox.is(':checked');
      if (currentChecked !== savedState.isChecked) {
        cy.wrap($checkbox).click(); // Toggle checkbox if needed
      }
    });

    // Submit restored settings
    clusterSettings.findSubmitButton().click();
  };

  // Initial attempt
  retryRestoreSettings();

  // Check for the error message and retry if necessary
  cy.get('body').then(($body) => {
    if (
      $body.find(
        "div:contains('Toleration key must consist of alphanumeric characters, '-', '_' or '.', and mus')",
      ).length > 0
    ) {
      cy.log('Error message found, retrying...');
      retryRestoreSettings(); // Retry the function
    }
  });
}
/**
 * Disables tolerations with a retry mechanism.
 * This function navigates to the cluster settings, finds the enabled checkbox, clicks it, and submits the form.
 * It includes a retry mechanism to ensure the tolerations are disabled.
 */
export function disableTolerationsWithRetry(): void {
  const retryDisableTolerations = () => {
    notebookTolerationSettings.findEnabledCheckbox().click();
    notebookTolerationSettings.findEnabledCheckbox().should('not.be.checked');
    clusterSettings.findSubmitButton().click();
  };
  retryDisableTolerations();
  notebookTolerationSettings.findEnabledCheckbox().should('not.be.checked');
}
