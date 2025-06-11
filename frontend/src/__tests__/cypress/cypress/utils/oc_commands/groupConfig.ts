import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';

const NAMESPACE = 'redhat-ods-applications';
const CONFIG_MAP_NAME = 'odh-enabled-applications-config';
const CONFIG_MAP_KEY = 'groups';

/**
 * Retrieves the groups configuration from OpenShift.
 *
 * @returns A Cypress.Chainable that resolves to the groups configuration.
 */
export const getGroupsConfig = (): Cypress.Chainable<CommandLineResult> => {
  // List all configmaps to debug
  const command = `oc get configmap -n ${NAMESPACE} ${CONFIG_MAP_NAME} -o jsonpath="{.data.${CONFIG_MAP_KEY}}"`;
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
