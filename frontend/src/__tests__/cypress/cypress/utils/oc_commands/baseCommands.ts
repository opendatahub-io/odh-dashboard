import type { CommandLineResult } from '~/__tests__/cypress/cypress/types';

/**
 * Applies the given YAML content using the `oc apply` command.
 *
 * @param yamlContent YAML content to be applied
 * @returns Cypress Chainable
 */
export const applyOpenShiftYaml = (yamlContent: string): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc apply -f - <<EOF\n${yamlContent}\nEOF`;
  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      // If there is an error, log the error and fail the test
      cy.log(`ERROR applying YAML content
              stdout: ${result.stdout}
              stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};

/**
 * Patches an OpenShift resource using the `oc patch` command.
 *
 * @param resourceType The type of resource to patch (e.g., 'storageclass')
 * @param resourceName The name of the resource to patch
 * @param patchContent The patch content as a JSON string
 * @returns Cypress Chainable
 */
export const patchOpenShiftResource = (
  resourceType: string,
  resourceName: string,
  patchContent: string,
): Cypress.Chainable<CommandLineResult> => {
  // Escape single quotes in the patch content
  const escapedPatchContent = patchContent.replace(/'/g, "'\\''");

  const ocCommand = `oc patch ${resourceType} ${resourceName} --type=merge -p '${escapedPatchContent}'`;

  cy.log(ocCommand);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      // If there is an error, log the error and fail the test
      cy.log(`ERROR patching ${resourceType} ${resourceName}
              stdout: ${result.stdout}
              stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};
