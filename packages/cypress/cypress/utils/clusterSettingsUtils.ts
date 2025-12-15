import { getOdhDashboardConfigGroupsConfig } from './oc_commands/project';
import type { CommandLineResult, DashboardConfig, NotebookControllerCullerConfig } from '../types';
import { modelServingSettings, pvcSizeSettings, cullerSettings } from '../pages/clusterSettings';

/**
 * Validates the visibility and state of Model Serving Platform checkboxes
 * in the Cluster Settings based on the provided dashboard configuration.
 *
 * This function checks whether the Model Serving feature is enabled or disabled,
 * and subsequently verifies the state of the Single-Platform checkbox.
 *
 * - If Model Serving is disabled, the checkbox should not be visible.
 * - If Model Serving is enabled:
 *   - The Single-Platform Checkbox will be checked if KServe is enabled;
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

/**
 * Checks if a user is in RHODS user groups (allowedGroups or adminGroups).
 * Throws an error if the user is already in these groups.
 *
 * @param userName The username to check.
 * @returns A Cypress.Chainable that resolves when the check is complete.
 */
export const checkUserNotInRHODSUserGroups = (userName: string): Cypress.Chainable<void> => {
  cy.step('Check if user is in RHODS user groups');
  return getOdhDashboardConfigGroupsConfig()
    .then((result: CommandLineResult) => {
      if (result.code === 0 && result.stdout && result.stdout.trim() !== '') {
        try {
          const groupsConfig = JSON.parse(result.stdout);
          const allowedGroups = groupsConfig.allowedGroups || [];
          const adminGroups = groupsConfig.adminGroups || [];

          cy.log(`Allowed Groups: ${JSON.stringify(allowedGroups)}`);
          cy.log(`Admin Groups: ${JSON.stringify(adminGroups)}`);

          // Check if user's groups are in the lists
          return cy
            .exec(`oc get user ${userName} -o jsonpath='{.groups[*]}' --ignore-not-found`, {
              failOnNonZeroExit: false,
            })
            .then((userGroupsResult: CommandLineResult) => {
              if (userGroupsResult.code === 0 && userGroupsResult.stdout) {
                const userGroups = userGroupsResult.stdout.trim().split(/\s+/).filter(Boolean);
                cy.log(`User groups: ${JSON.stringify(userGroups)}`);

                // Verify user is not in allowedGroups or adminGroups
                const isInAllowedGroups = userGroups.some((group) => allowedGroups.includes(group));
                const isInAdminGroups = userGroups.some((group) => adminGroups.includes(group));

                if (isInAllowedGroups || isInAdminGroups) {
                  throw new Error(
                    `User ${userName} is already in allowedGroups or adminGroups. Cannot proceed with test.`,
                  );
                }
              }
            });
        } catch (error) {
          cy.log('Could not parse groupsConfig, continuing with test');
          return cy.wrap(undefined);
        }
      }
      return cy.wrap(undefined);
    })
    .then(() => {
      // Explicitly return void to satisfy type checker
    }) as unknown as Cypress.Chainable<void>;
};
