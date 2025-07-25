import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';

/**
 * Creates a new OpenShift group
 * @param groupName Name of the group to create
 * @returns A Cypress chainable that resolves to the command result
 * @throws Error if the command fails
 */
export const createGroup = (groupName: string): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc adm groups new ${groupName} --dry-run=client -o yaml | oc apply --validate=false -f -`;
  cy.log(`Creating group with command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`ERROR creating group ${groupName}
              stdout: ${result.stdout}
              stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};

/**
 * Deletes an OpenShift group
 * @param groupName Name of the group to delete
 * @returns A Cypress chainable that resolves to the command result
 * @throws Error if the command fails
 */
export const deleteGroup = (groupName: string): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc delete group ${groupName} --ignore-not-found`;
  cy.log(`Deleting group with command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`ERROR deleting group ${groupName}
              stdout: ${result.stdout}
              stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};

/**
 * Checks if a group exists
 * @param groupName Name of the group to check
 * @returns A Cypress chainable that resolves to true if the group exists, false otherwise
 */
export const groupExists = (groupName: string): Cypress.Chainable<boolean> => {
  const ocCommand = `oc get group ${groupName}`;
  cy.log(`Checking group existence with command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => result.code === 0);
};
