import type { CommandLineResult } from '~/__tests__/cypress/cypress/types';

/**
 * Retrieves the groups configuration from OpenShift.
 *
 * @returns A Cypress.Chainable that resolves to the groups configuration.
 */
export const getGroupsConfig = (): Cypress.Chainable<CommandLineResult> => {
  // List all configmaps to debug
  const command =
    'oc get configmap -n redhat-ods-applications odh-enabled-applications-config -o jsonpath="{.data.groups}"';
  cy.log(`Getting groups config: ${command}`);

  return cy.exec(command, { failOnNonZeroExit: false }).then((result) => {
    if (result.code !== 0) {
      cy.log(`ERROR getting groups config
              stdout: ${result.stdout}
              stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};
