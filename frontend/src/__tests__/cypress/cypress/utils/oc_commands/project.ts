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

/**
 * Verify if an OpenShift Project exists
 *
 * @param projectName OpenShift Project name to verify (in the format like 'cypress-test-project')
 * @returns A Cypress chainable boolean indicating whether the project exists (true) or not (false)
 */
export const verifyOpenShiftProjectExists = (projectName: string): Cypress.Chainable<boolean> => {
  if (!projectName || typeof projectName !== 'string') {
    cy.log(`ERROR: Invalid project name provided: ${projectName}`);
    throw new Error(`Invalid project name: ${projectName}`);
  }

  const checkCommand = `oc get project "${projectName}" -o name`;

  cy.log(`Executing command: ${checkCommand}`);

  return cy.exec(checkCommand, { failOnNonZeroExit: false }).then((result: Cypress.Exec) => {
    cy.log(`Command result: ${JSON.stringify(result)}`);

    if (result.code !== 0 && result.code !== 1) {
      // Code 1 is expected when the project doesn't exist, so we only throw for other non-zero codes
      cy.log(`ERROR: Command execution failed
              stdout: ${result.stdout}
              stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }

    const projectExists =
      result.code === 0 && result.stdout.trim() === `project.project.openshift.io/${projectName}`;

    if (projectExists) {
      cy.log(`Project '${projectName}' exists.`);
    } else {
      cy.log(`Project '${projectName}' does not exist.`);
    }

    return cy.wrap(projectExists);
  });
};
