import type { CommandLineResult } from '~/__tests__/cypress/cypress/types';

/**
 * Create an OpenShift Project
 *
 * @param projectName Project Name
 * @param displayName Project Display Name
 * @returns Result Object of the operation
 */
export const createOpenShiftProject = (
  projectName: string,
  displayName?: string,
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = displayName
    ? `oc new-project ${projectName} --display-name='${displayName}'`
    : `oc new-project ${projectName}`;

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    if (result.code !== 0) {
      cy.log(`ERROR provisioning ${projectName} Project
                stdout: ${result.stdout}
                stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};

/**
 * Delete an OpenShift Project given its name
 *
 * @param projectName OpenShift Project name
 * @returns Result Object of the operation
 */
export const deleteOpenShiftProject = (
  projectName: string,
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc delete project ${projectName}`;
  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    if (result.code !== 0) {
      cy.log(`ERROR deleting ${projectName} Project
                stdout: ${result.stdout}
                stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};

/**
 * Assign a role to a user for an specific Project
 *
 * @param projectName OpenShift Project name
 * @param userName User
 * @param role OpenShift Role (edit, admin, view)
 * @returns Result Object of the operation
 */
export const addUserToProject = (
  projectName: string,
  userName: string,
  role = 'edit',
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc adm policy add-role-to-user ${role} ${userName} -n ${projectName}`;
  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    if (result.code !== 0) {
      cy.log(`ERROR Assigning role ${role} to user ${userName} in ${projectName} Project
                stdout: ${result.stdout}
                stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};
