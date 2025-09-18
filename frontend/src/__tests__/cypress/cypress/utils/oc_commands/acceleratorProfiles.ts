import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';
import { createCustomResource } from './customResources';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE') || 'redhat-ods-applications';

/**
 * `cleanupAcceleratorProfiles` searches for an AcceleratorProfile in the specified namespace that contains a provided name.
 *
 * If an AcceleratorProfile is found, it is deleted using `oc`. If no matching profile is found, a message is logged.
 *
 * @param acceleratorProfile - The `displayName` substring to search for in AcceleratorProfiles.
 * @returns A Cypress.Chainable that resolves to:
 *   - The `CommandLineResult` of the deletion command, if a profile was found and deleted.
 *   - The original `CommandLineResult` if no matching profile was found. This allows chaining even if no deletion occurs.
 */
export const cleanupAcceleratorProfiles = (
  acceleratorProfile: string,
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc get acceleratorprofiles -ojson -n ${applicationNamespace} | jq --arg profile "${acceleratorProfile}" '.items[] | select(.spec.displayName | contains($profile)) | .metadata.name' | tr -d '"'`;
  cy.log(`Executing command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    const profileName = result.stdout.trim();

    if (profileName) {
      cy.log(`Accelerator Profile found: ${profileName}. Proceeding to delete.`);
      const deleteCommand = `oc delete acceleratorprofiles ${profileName} -n ${applicationNamespace}`;
      return cy.exec(deleteCommand, { failOnNonZeroExit: false });
    }

    return cy.wrap(result);
  });
};

/**
 * Creates a clean accelerator profile by first cleaning up any existing profile with the same name,
 * then creating a new one.
 *
 * @param acceleratorProfile - The name or path of the accelerator profile to create
 *
 * This function performs the following steps:
 * 1. Cleans up any existing accelerator profile with the given name by calling `cleanupAcceleratorProfiles`.
 * 2. Creates a new accelerator profile using the provided name or path.
 */
export const createAcceleratorProfile = (acceleratorProfile: string): void => {
  cy.log(`Cleaning up and creating Accelerator Profile: ${acceleratorProfile}`);
  cleanupAcceleratorProfiles(acceleratorProfile).then(() => {
    cy.log(`Creating Accelerator Profile: ${acceleratorProfile}`);
    createCustomResource(applicationNamespace, acceleratorProfile);
  });
};
