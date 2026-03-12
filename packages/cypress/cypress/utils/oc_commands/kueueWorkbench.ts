import { applyOpenShiftYaml } from './baseCommands';
import { cleanupHardwareProfiles } from './hardwareProfiles';
import { maskSensitiveInfo } from '../maskSensitiveInfo';
import type { CommandLineResult } from '../../types';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

export interface KueueWorkbenchConfig {
  flavorName: string;
  clusterQueueName: string;
  localQueueName: string;
  hardwareProfileName: string;
  hardwareProfileDisplayName: string;
  cpuQuota: number;
  memoryQuota: number;
}

/**
 * Adds the Kueue managed label to a namespace.
 *
 * @param namespace - The namespace to label
 * @returns A Cypress chainable with the command result
 */
export const addKueueLabelToNamespace = (
  namespace: string,
): Cypress.Chainable<CommandLineResult> => {
  const labelCommand = `oc label namespace ${namespace} kueue.openshift.io/managed=true --overwrite`;
  cy.log(`Adding Kueue label to namespace: ${namespace}`);
  return cy.exec(labelCommand, { failOnNonZeroExit: false }).then((result) => {
    if (result.code !== 0) {
      cy.log(`Warning: Failed to label namespace: ${result.stderr}`);
    }
    return cy.wrap(result);
  });
};

/**
 * Creates Kueue resources for workbench testing: ResourceFlavor, ClusterQueue, and LocalQueue.
 *
 * @param config - Configuration for the Kueue resources
 * @param namespace - The namespace for the LocalQueue
 * @returns A Cypress chainable
 */
export const createKueueWorkbenchResources = (
  config: KueueWorkbenchConfig,
  namespace: string,
): Cypress.Chainable<CommandLineResult> =>
  cy.fixture('resources/yaml/kueue-resources-workbench.yaml').then((yamlTemplate) => {
    const variables = {
      flavorName: config.flavorName,
      clusterQueueName: config.clusterQueueName,
      localQueueName: config.localQueueName,
      namespace,
      cpuQuota: config.cpuQuota,
      memoryQuota: config.memoryQuota,
    };

    let yamlContent = yamlTemplate;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      yamlContent = yamlContent.replace(regex, String(variables[key as keyof typeof variables]));
    });

    cy.log(
      `Creating Kueue resources: flavor=${config.flavorName}, clusterQueue=${config.clusterQueueName}, localQueue=${config.localQueueName}`,
    );
    return applyOpenShiftYaml(yamlContent);
  });

/**
 * Creates a Kueue-enabled hardware profile.
 *
 * @param config - Configuration for the hardware profile
 * @returns A Cypress chainable
 */
export const createKueueHardwareProfile = (
  config: KueueWorkbenchConfig,
): Cypress.Chainable<CommandLineResult> =>
  cy.fixture('resources/hardwareProfile/kueue_workbench_profile.yaml').then((yamlTemplate) => {
    const variables = {
      hardwareProfileName: config.hardwareProfileName,
      hardwareProfileNamespace: applicationNamespace,
      displayName: config.hardwareProfileDisplayName,
      localQueueName: config.localQueueName,
    };

    let yamlContent = yamlTemplate;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      yamlContent = yamlContent.replace(regex, String(variables[key as keyof typeof variables]));
    });

    cy.log(`Creating Kueue-enabled hardware profile: ${config.hardwareProfileDisplayName}`);
    return applyOpenShiftYaml(yamlContent, applicationNamespace);
  });

/**
 * Deletes Kueue resources created for testing.
 *
 * @param config - Configuration containing resource names
 * @param namespace - The namespace for the LocalQueue
 */
export const deleteKueueWorkbenchResources = (
  config: KueueWorkbenchConfig,
  namespace: string,
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `
    oc delete LocalQueue ${config.localQueueName} -n ${namespace} --ignore-not-found=true --wait=false;
    oc delete ClusterQueue ${config.clusterQueueName} --ignore-not-found=true --wait=false;
    oc delete ResourceFlavor ${config.flavorName} --ignore-not-found=true --wait=false
  `;

  cy.log('Deleting Kueue resources');
  return cy.exec(ocCommand, { failOnNonZeroExit: false, timeout: 120000 }).then((result) => {
    if (result.code !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      cy.log(`Warning: Error deleting Kueue resources: ${maskedStderr}`);
    }
    return cy.wrap(result);
  });
};

/**
 * Sets up all Kueue resources needed for workbench testing.
 * This includes: adding the Kueue label, creating ResourceFlavor, ClusterQueue, LocalQueue, and HardwareProfile.
 *
 * @param config - Configuration for the Kueue resources
 * @param namespace - The namespace for the project
 * @returns A Cypress chainable
 */
export const setupKueueWorkbenchResources = (
  config: KueueWorkbenchConfig,
  namespace: string,
): Cypress.Chainable<CommandLineResult> => {
  cy.log(`Setting up Kueue workbench resources in namespace: ${namespace}`);

  return addKueueLabelToNamespace(namespace)
    .then(() => createKueueWorkbenchResources(config, namespace))
    .then(() => createKueueHardwareProfile(config))
    .then((result) => {
      cy.log('Kueue workbench resources setup complete');
      return cy.wrap(result);
    });
};

/**
 * Verifies that a Kueue Workload CR exists and is admitted in the given namespace.
 *
 * @param namespace - The namespace to check for Workload resources
 * @returns A Cypress chainable that asserts the Workload is admitted
 */
export const verifyWorkloadAdmitted = (namespace: string): Cypress.Chainable<string> => {
  cy.log(`Verifying Kueue Workload is admitted in namespace: ${namespace}`);
  return cy
    .exec(
      `oc get workloads -n ${namespace} -o jsonpath='{.items[0].status.conditions[?(@.type=="Admitted")].status}'`,
    )
    .its('stdout')
    .should('contain', 'True');
};

/**
 * Cleans up all Kueue resources created for workbench testing.
 *
 * @param config - Configuration containing resource names
 * @param namespace - The namespace for the project
 */
export const cleanupKueueWorkbenchResources = (
  config: KueueWorkbenchConfig,
  namespace: string,
): void => {
  cy.log('Cleaning up Kueue workbench resources');

  cleanupHardwareProfiles(config.hardwareProfileName);
  deleteKueueWorkbenchResources(config, namespace);
};
