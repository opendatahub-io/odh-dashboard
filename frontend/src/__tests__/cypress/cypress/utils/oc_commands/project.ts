import type { CommandLineResult, DashboardConfig } from '~/__tests__/cypress/cypress/types';
import { handleOCCommandResult } from '~/__tests__/cypress/cypress/utils/errorHandling';

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
 * @param options Configuration options for the delete operation
 * @param options.timeout Timeout in milliseconds for the command (only used when wait is true)
 * @param options.wait Whether to wait for the deletion to complete (default: true)
 * @returns Result Object of the operation
 */
export const deleteOpenShiftProject = (
  projectName: string,
  options: { timeout?: number; wait?: boolean } = {},
): Cypress.Chainable<CommandLineResult> => {
  const { timeout, wait = true } = options;
  const waitFlag = wait ? '' : '--wait=false';
  const ocCommand = `oc delete project ${projectName} ${waitFlag}`.trim();

  // Only apply timeout if we're waiting for the deletion
  const execOptions = {
    failOnNonZeroExit: false,
    ...(wait && timeout && { timeout }),
  };

  return cy.exec(ocCommand, execOptions).then((result) => {
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
 * Get OpenShift Project
 *
 * @param projectName OpenShift Project name to get (in the format like 'cypress-test-project')
 * @returns A Cypress chainable with the project information or null if not found
 */
export const getOpenShiftProject = (projectName: string): Cypress.Chainable<string | null> => {
  if (!projectName || typeof projectName !== 'string') {
    cy.log(`ERROR: Invalid project name provided: ${projectName}`);
    throw new Error(`Invalid project name: ${projectName}`);
  }
  const checkCommand = `oc get project "${projectName}" -o name`;
  cy.log(`Executing command: ${checkCommand}`);
  return cy.exec(checkCommand, { failOnNonZeroExit: false }).then((result: Cypress.Exec) => {
    cy.log(`Command result: ${JSON.stringify(result)}`);
    // Use the utility function to handle command result
    handleOCCommandResult(result);
    // Use cy.wrap to ensure we're returning a Cypress chainable
    return cy.wrap(result.code === 0 ? result.stdout.trim() : null);
  });
};

/**
 * Verify if an OpenShift Project exists
 *
 * @param projectName OpenShift Project name to verify (in the format like 'cypress-test-project')
 * @returns A Cypress chainable boolean indicating whether the project exists (true) or not (false)
 */
export const verifyOpenShiftProjectExists = (projectName: string): Cypress.Chainable<boolean> => {
  return getOpenShiftProject(projectName).then((projectInfo) => {
    const projectExists = projectInfo === `project.project.openshift.io/${projectName}`;
    if (projectExists) {
      cy.log(`Project '${projectName}' exists.`);
    } else {
      cy.log(`Project '${projectName}' does not exist.`);
    }
    return cy.wrap(projectExists);
  });
};

/**
 * Retrieves the DashboardConfig from OpenShift and returns either the full config or a specific value.
 *
 * @param key Optional. The specific config key to retrieve (use dot notation for nested properties).
 * @returns A Cypress.Chainable that resolves to the requested config value or the full config object.
 */
export const getDashboardConfig = (key?: string): Cypress.Chainable<unknown> => {
  const command = `oc get OdhDashboardConfig -A -o json | jq '.items[].spec'`;

  return cy.exec(command).then((result) => {
    if (result.code !== 0) {
      throw new Error(`Failed to get DashboardConfig: ${result.stderr}`);
    }
    const config = JSON.parse(result.stdout) as DashboardConfig;

    if (key) {
      // If a specific key is requested, return that value
      return Cypress.Promise.resolve(getNestedProperty(config, key));
    }
    // Otherwise, return the full config
    return Cypress.Promise.resolve(config);
  });
};

/**
 * Retrieves the Notebook Controller Config from OpenShift and returns either the full config or a specific value.
 *
 * @param key Optional. The specific config key to retrieve (use dot notation for nested properties).
 * @returns A Cypress.Chainable that resolves to the requested config value or the full config object.
 */
export const getNotebookControllerConfig = (key?: string): Cypress.Chainable<unknown> => {
  const command = `oc get configmaps -l app=notebook-controller -A -o jsonpath='{.items[0].data}' | jq .`;

  return cy.exec(command).then((result) => {
    if (result.code !== 0) {
      throw new Error(`Failed to get Notebook Controller Config: ${result.stderr}`);
    }

    const config = JSON.parse(result.stdout) as Record<string, unknown>; // Adjust type as needed

    if (key) {
      return Cypress.Promise.resolve(getNestedProperty(config, key));
    }

    return Cypress.Promise.resolve(config); // Ensure this returns a promise
  });
};

/**
 * Retrieves the Notebook Controller Config from OpenShift and returns either the full config or a specific value.
 *
 * @param key Optional. The specific config key to retrieve (use dot notation for nested properties).
 * @returns A Cypress.Chainable that resolves to the requested config value or the full config object.
 */
export const getNotebookControllerCullerConfig = (key?: string): Cypress.Chainable<unknown> => {
  const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');
  const command = `oc get configmap -n ${applicationNamespace} notebook-controller-culler-config -o jsonpath='{.data}' | jq .`;

  // Log the command being executed
  cy.log('Executing command:', command);

  return cy.exec(command).then((result) => {
    // Log the std error
    cy.log('Command stderr:', result.stderr);

    if (result.code !== 0) {
      return Cypress.Promise.resolve(`Error: ${result.stderr.trim()}`);
    }

    const trimmedOutput = result.stdout.trim();
    if (!trimmedOutput) {
      return Cypress.Promise.resolve('Error: Empty configuration');
    }

    try {
      const config = JSON.parse(trimmedOutput) as Record<string, unknown>;
      return key
        ? Cypress.Promise.resolve(getNestedProperty(config, key))
        : Cypress.Promise.resolve(config);
    } catch (error) {
      return Cypress.Promise.resolve(`Error: Invalid JSON - ${trimmedOutput}`);
    }
  });
};

// Helper function to safely get nested properties
function getNestedProperty(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
