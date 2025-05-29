import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';
import { createCustomResource } from './customResources';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

/**
 * `cleanupHardwareProfiles` searches for a HardwareProfile in the specified namespace that contains a provided name.
 *
 * If a HardwareProfile is found, it is deleted using `oc`. If no matching profile is found, a message is logged.
 *
 * @param hardwareProfile - The `displayName` substring to search for in HardwareProfiles.
 * @returns A Cypress.Chainable that resolves to:
 *   - The `CommandLineResult` of the deletion command, if a profile was found and deleted.
 *   - The original `CommandLineResult` if no matching profile was found.  This allows chaining even if no deletion occurs.
 */
export const cleanupHardwareProfiles = (
  hardwareProfile: string,
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc get hardwareprofiles -ojson -n ${applicationNamespace} | jq '.items[] | select(.spec.displayName | contains("${hardwareProfile}")) | .metadata.name' | tr -d '"'`;
  cy.log(`Executing command: ${ocCommand}`);

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
 * @param hardwareProfile - The name or path of the hardware profile to create
 *
 * This function performs the following steps:
 * 1. Cleans up any existing hardware profile with the given name by calling `cleanupHardwareProfiles`.
 * 2. Creates a new hardware profile using the provided name or path.
 */
export const createCleanHardwareProfile = (hardwareProfile: string): void => {
  cy.log(`Cleaning up and creating Hardware Profile: ${hardwareProfile}`);
  cleanupHardwareProfiles(hardwareProfile).then(() => {
    cy.log(`Creating Hardware Profile: ${hardwareProfile}`);
    createCustomResource(applicationNamespace, hardwareProfile);
  });
};
