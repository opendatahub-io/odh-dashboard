import type { CommandLineResult } from '~/__tests__/cypress/cypress//types';
import { applyOpenShiftYaml } from '~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';

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

export const deleteKueueResources = (
  localQueueName: string,
  clusterQueueName: string,
  resourceFlavor: string,
  projectName: string,
): Cypress.Chainable<CommandLineResult> => {
  // Create the OC command to delete the resources
  const ocCommand = `
      oc delete LocalQueue ${localQueueName} -n ${projectName} && 
      oc delete ClusterQueue ${clusterQueueName} && 
      oc delete ResourceFlavor ${resourceFlavor}
    `;

  cy.log(`Executing: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      throw new Error(`Command failed with code ${result.stderr}`);
    }

    if (result.stdout.trim() === '') {
      cy.log('No Kueue resources found or deleted');
    } else {
      cy.log(`Kueue resources deletion: ${result.stdout}`);
    }
  });
};
