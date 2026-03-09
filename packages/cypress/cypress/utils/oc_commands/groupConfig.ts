import type { CommandLineResult } from '../../types';

/**
 * Retrieves the groups configuration from the Auth Custom Resource.
 *
 * @returns A Cypress.Chainable that resolves to the groups configuration.
 */
export const getGroupsConfig = (): Cypress.Chainable<CommandLineResult> => {
  const command = `oc get auth auth -o jsonpath="{.spec.adminGroups},{.spec.allowedGroups}"`;
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

/**
 * Restores the default groups configuration to rhods-admins and system:authenticated.
 * This is useful for test cleanup to ensure the cluster is in a known state.
 */
export const restoreDefaultGroupsConfig = (): void => {
  const command = `oc patch auth auth --type=json -p='[{"op": "replace", "path": "/spec/adminGroups", "value": ["rhods-admins"]}, {"op": "replace", "path": "/spec/allowedGroups", "value": ["system:authenticated"]}]'`;

  cy.log('Restoring default groups configuration to rhods-admins / system:authenticated');

  cy.exec(command, { failOnNonZeroExit: false }).then((result) => {
    if (result.code !== 0) {
      cy.log(`ERROR restoring groups config
              stdout: ${result.stdout}
              stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    cy.log(`Restored groups config: ${result.stdout}`);
  });
};

/**
 * Updates the groups configuration with custom admin and allowed groups.
 *
 * @param adminGroups - Comma-separated list of admin group names (e.g., "rhods-admins,test-group")
 * @param allowedGroups - Comma-separated list of allowed user group names (e.g., "rhods-users,system:authenticated")
 */
export const updateGroupsConfig = (adminGroups: string, allowedGroups: string): void => {
  // Convert comma-separated strings to arrays for Auth CR spec
  const adminGroupsArray = adminGroups.split(',').map((g) => g.trim());
  const allowedGroupsArray = allowedGroups.split(',').map((g) => g.trim());

  const command = `oc patch auth auth --type=json -p='[{"op": "replace", "path": "/spec/adminGroups", "value": ${JSON.stringify(
    adminGroupsArray,
  )}}, {"op": "replace", "path": "/spec/allowedGroups", "value": ${JSON.stringify(
    allowedGroupsArray,
  )}}]'`;

  cy.log(`Updating groups config - Admin: ${adminGroups}, Allowed: ${allowedGroups}`);

  cy.exec(command, { failOnNonZeroExit: false }).then((result) => {
    if (result.code !== 0) {
      cy.log(`ERROR updating groups config
              stdout: ${result.stdout}
              stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    cy.log(`Updated groups config: ${result.stdout}`);
  });
};
