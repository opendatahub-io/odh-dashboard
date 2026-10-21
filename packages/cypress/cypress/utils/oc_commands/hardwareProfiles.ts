import { createCustomResource } from './customResources';
import type { CommandLineResult } from '../../types';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

/**
 * `cleanupHardwareProfiles` searches for a HardwareProfile in the specified namespace that contains a provided name.
 *
 * If a HardwareProfile is found, it is deleted using `oc`. If no matching profile is found, a message is logged.
 *
 * @param hardwareProfile - The `metadata.name` substring to search for in HardwareProfiles.
 * @returns A Cypress.Chainable that resolves to:
 *   - The `CommandLineResult` of the deletion command, if a profile was found and deleted.
 *   - The original `CommandLineResult` if no matching profile was found.  This allows chaining even if no deletion occurs.
 */
export const cleanupHardwareProfiles = (
  hardwareProfile: string,
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc get hardwareprofiles -ojson -n ${applicationNamespace} | jq '.items[] | select(.metadata.name | contains("${hardwareProfile}")) | .metadata.name' | tr -d '"'`;
  cy.log(`Executing delete hardware profile command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    const profileName = result.stdout.trim();

    if (profileName) {
      cy.log(`Hardware Profile found: ${profileName}. Proceeding to delete.`);
      const deleteCommand = `oc delete hardwareprofiles ${profileName} -n ${applicationNamespace}`;
      return cy.exec(deleteCommand, { failOnNonZeroExit: false });
    }
    cy.log('No matching profile found, proceeding with the test.');
    return cy.wrap(result);
  });
};

/**
 * Creates a clean hardware profile by first cleaning up any existing profile with the same name,
 * then creating a new one.
 *
 * @param hardwareProfileYamlPath - Fixture path for the HardwareProfile YAML
 * @param hardwareProfileName - Optional `metadata.name` substring for cleanup. Prefer this over the
 *   YAML path — cleanup searches resource names, not file paths.
 */
export const createCleanHardwareProfile = (
  hardwareProfileYamlPath: string,
  hardwareProfileName?: string,
): void => {
  const cleanupKey = hardwareProfileName ?? hardwareProfileYamlPath;
  cy.log(
    `Cleaning up and creating Hardware Profile: path=${hardwareProfileYamlPath}, cleanup=${cleanupKey}`,
  );
  cleanupHardwareProfiles(cleanupKey).then(() => {
    cy.log(`Creating Hardware Profile: ${hardwareProfileYamlPath}`);
    createCustomResource(applicationNamespace, hardwareProfileYamlPath).then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(
          `Failed to create HardwareProfile in ${applicationNamespace} from ${hardwareProfileYamlPath}: ${result.stderr}`,
        );
      }
    });
  });
};
