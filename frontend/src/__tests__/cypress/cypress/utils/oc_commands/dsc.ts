import type { CommandLineResult, ManagementState } from '#~/__tests__/cypress/cypress/types';
import { patchOpenShiftResource } from './baseCommands';

/**
 * Get the Data Science Cluster resource as JSON
 * @param dscName The name of the DSC resource (default: 'default-dsc')
 * @returns Cypress Chainable with the DSC JSON
 */
export const getDscAsJson = (
  dscName = 'default-dsc',
): Cypress.Chainable<Record<string, unknown>> => {
  const ocCommand = `oc get datasciencecluster ${dscName} -o json`;
  cy.log(`Executing command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`ERROR Getting DSC ${dscName}
              stdout: ${result.stdout}
              stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }

    try {
      const dscJson = JSON.parse(result.stdout) as Record<string, unknown>;
      return cy.wrap(dscJson);
    } catch (error) {
      cy.log(`ERROR Parsing DSC JSON: ${error instanceof Error ? error.message : 'unknown error'}`);
      throw new Error('Failed to parse DSC JSON');
    }
  });
};

/**
 * Get the current management state of the kueue component in DSC
 * @param dscName The name of the DSC resource (default: 'default-dsc')
 * @returns Cypress Chainable with the management state or undefined
 */
export const getKueueManagementState = (
  dscName = 'default-dsc',
): Cypress.Chainable<ManagementState | undefined> => {
  return getDscAsJson(dscName).then((dscJson) => {
    const spec = dscJson.spec as Record<string, unknown>;
    const components = spec.components as Record<string, unknown> | undefined;
    const kueue = components?.kueue as { managementState?: string } | undefined;

    const managementState = kueue?.managementState as ManagementState | undefined;
    cy.log(`Kueue management state: ${managementState ?? 'not set'}`);
    return cy.wrap(managementState);
  });
};

/**
 * Update the management state of the kueue component in DSC
 * @param managementState The management state to set (Managed, Unmanaged, or Removed)
 * @param dscName The name of the DSC resource (default: 'default-dsc')
 * @returns Cypress Chainable with the result of the patch operation
 */
export const updateKueueManagementState = (
  managementState: ManagementState,
  dscName = 'default-dsc',
): Cypress.Chainable<CommandLineResult> => {
  const patchContent = JSON.stringify({
    spec: {
      components: {
        kueue: {
          managementState,
        },
      },
    },
  });

  cy.log(`Patching DSC ${dscName} kueue component with managementState: ${managementState}`);
  // Note: If 'datasciencecluster' short name doesn't work, try: 'datasciencecluster.v1.datasciencecluster.opendatahub.io'
  return patchOpenShiftResource('datasciencecluster', dscName, patchContent);
};
