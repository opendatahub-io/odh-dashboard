import type { CommandLineResult } from '#~/__tests__/cypress/cypress//types';
import { applyOpenShiftYaml } from '#~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';

/**
 * Creates Kueue resources by applying a YAML template.
 * This function dynamically replaces placeholders in the template with actual values and applies it.
 *
 * @param {string} flavorName - The name of the resource flavor.
 * @param {string} clusterQueueName - The name of the cluster queue.
 * @param {string} localQueueName - The name of the local queue.
 * @param {string} namespace - The namespace in which to create the resources.
 * @param {number} cpuQuota - The CPU quota allocated to the resources.
 * @param {number} memoryQuota - The memory quota allocated to the resources.
 */
export const createKueueResources = (
  flavorName: string,
  clusterQueueName: string,
  localQueueName: string,
  namespace: string,
  cpuQuota: number,
  memoryQuota: number,
): void => {
  cy.fixture('resources/yaml/kueue_reosources.yaml').then((yamlTemplate) => {
    const variables = {
      flavorName,
      clusterQueueName,
      localQueueName,
      namespace,
      cpuQuota,
      memoryQuota,
    };

    // Replace placeholders in YAML with actual values
    let yamlContent = yamlTemplate;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      yamlContent = yamlContent.replace(regex, String(variables[key as keyof typeof variables]));
    });

    // Apply the modified YAML
    applyOpenShiftYaml(yamlContent);
  });
};

/**
 * Deletes Kueue resources by executing `oc delete` commands.
 *
 * @param {string} localQueueName - The name of the local queue to delete.
 * @param {string} clusterQueueName - The name of the cluster queue to delete.
 * @param {string} resourceFlavor - The name of the resource flavor to delete.
 * @param {string} projectName - The namespace/project in which the resources exist.
 * @param {object} options - Configuration options for the deletion operation.
 * @param {number} options.timeout - Timeout in milliseconds for the command (only used when wait is true).
 * @param {boolean} options.wait - Whether to wait for the deletion to complete (default: true).
 * @param {boolean} options.ignoreNotFound - Whether to ignore errors when resources are not found (default: false).
 * @returns {Cypress.Chainable<CommandLineResult>} A Cypress chainable resolving with the result of the deletion command.
 */
export const deleteKueueResources = (
  localQueueName: string,
  clusterQueueName: string,
  resourceFlavor: string,
  projectName: string,
  options: { timeout?: number; wait?: boolean; ignoreNotFound?: boolean } = {},
): Cypress.Chainable<CommandLineResult> => {
  const { timeout, wait = true, ignoreNotFound = false } = options;

  // Create the OC command to delete the resources
  const ocCommand = `
      oc delete LocalQueue ${localQueueName} -n ${projectName} && 
      oc delete ClusterQueue ${clusterQueueName} && 
      oc delete ResourceFlavor ${resourceFlavor}
    `;

  cy.log(`Executing: ${ocCommand}`);

  // Only apply timeout if we're waiting for the deletion
  const execOptions = {
    failOnNonZeroExit: false,
    ...(wait && timeout && { timeout }),
  };

  return cy.exec(ocCommand, execOptions).then((result) => {
    if (result.code !== 0) {
      cy.log(`ERROR deleting Kueue resources
                stdout: ${result.stdout}
                stderr: ${result.stderr}`);
      if (!ignoreNotFound) {
        throw new Error(`Command failed with code ${result.code}`);
      }
    }
    return result;
  });
};
