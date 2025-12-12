import type { CommandLineResult } from '../../types';

/**
 * Creates Kueue resources for training jobs by applying a YAML template.
 * This function dynamically replaces placeholders in the template with actual values and applies it.
 *
 * @param flavorName - The name of the resource flavor.
 * @param clusterQueueName - The name of the cluster queue.
 * @param localQueueName - The name of the local queue.
 * @param namespace - The namespace in which to create the resources.
 * @param cpuQuota - The CPU quota allocated to the resources.
 * @param memoryQuota - The memory quota allocated to the resources (in Gi).
 * @param gpuQuota - The GPU quota allocated to the resources.
 */
export const createTrainingKueueResources = (
  flavorName: string,
  clusterQueueName: string,
  localQueueName: string,
  namespace: string,
  cpuQuota: number,
  memoryQuota: number,
  gpuQuota: number,
): void => {
  //add the Kueue label to the namespace
  const labelCommand = `oc label namespace ${namespace} kueue.openshift.io/managed=true --overwrite`;
  cy.log(`Adding Kueue label to namespace: ${namespace}`);
  cy.exec(labelCommand, { failOnNonZeroExit: false }).then((labelResult) => {
    if (labelResult.code !== 0) {
      cy.log(`Warning: Failed to label namespace: ${labelResult.stderr}`);
    } else {
      cy.log(`Kueue label added to namespace ${namespace}`);
    }
  });

  // create the Kueue resources
  cy.fixture('resources/yaml/kueue-resources-training.yaml').then((yamlTemplate) => {
    const variables = {
      flavorName,
      clusterQueueName,
      localQueueName,
      namespace,
      cpuQuota,
      memoryQuota,
      gpuQuota,
    };

    // Replace placeholders in YAML with actual values
    let yamlContent = yamlTemplate;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      yamlContent = yamlContent.replace(regex, String(variables[key as keyof typeof variables]));
    });

    cy.log(
      `Creating Kueue resources with: flavor=${flavorName}, clusterQueue=${clusterQueueName}, localQueue=${localQueueName}`,
    );

    // Write to temp file and apply with failOnNonZeroExit: true to see actual error
    const tempFile = `/tmp/kueue-resources-${Date.now()}.yaml`;
    cy.writeFile(tempFile, yamlContent);
    cy.exec(`oc apply -f ${tempFile}`, { failOnNonZeroExit: true, timeout: 30000 }).then(
      (result) => {
        cy.log(`Kueue resources created: ${result.stdout}`);
        cy.exec(`rm -f ${tempFile}`, { failOnNonZeroExit: false });
      },
    );
  });
};

/**
 * Deletes Kueue resources for training jobs by executing `oc delete` commands.
 *
 * @param localQueueName - The name of the local queue to delete.
 * @param clusterQueueName - The name of the cluster queue to delete.
 * @param resourceFlavor - The name of the resource flavor to delete.
 * @param namespace - The namespace in which the resources exist.
 * @param options - Configuration options for the deletion operation.
 * @param options.wait - Whether to wait for the deletion to complete (default: true).
 * @param options.ignoreNotFound - Whether to ignore errors when resources are not found (default: false).
 * @returns A Cypress chainable resolving with the result of the deletion command.
 */
export const deleteTrainingKueueResources = (
  localQueueName: string,
  clusterQueueName: string,
  resourceFlavor: string,
  namespace: string,
  options: { wait?: boolean; ignoreNotFound?: boolean } = {},
): Cypress.Chainable<CommandLineResult> => {
  const { ignoreNotFound = false } = options;

  const deleteLocalQueue = `oc delete LocalQueue ${localQueueName} -n ${namespace} --ignore-not-found=${ignoreNotFound} --wait=false`;
  const deleteClusterQueue = `oc delete ClusterQueue ${clusterQueueName} --ignore-not-found=${ignoreNotFound} --wait=false`;
  const deleteResourceFlavor = `oc delete ResourceFlavor ${resourceFlavor} --ignore-not-found=${ignoreNotFound} --wait=false`;

  cy.log(`Deleting Kueue resources: ${localQueueName}, ${clusterQueueName}, ${resourceFlavor}`);

  return cy
    .exec(deleteLocalQueue, { failOnNonZeroExit: false, timeout: 120000 })
    .then(() => cy.exec(deleteClusterQueue, { failOnNonZeroExit: false, timeout: 120000 }))
    .then(() => cy.exec(deleteResourceFlavor, { failOnNonZeroExit: false, timeout: 120000 }))
    .then((result) => {
      cy.log('Kueue resources cleanup completed');
      return result;
    });
};

/**
 * Creates a TrainingRuntime resource by applying a YAML template.
 *
 * @param namespace - The namespace in which to create the TrainingRuntime.
 * @param trainingRuntimeName - The name for the TrainingRuntime resource.
 */
export const createTrainingRuntime = (namespace: string, trainingRuntimeName: string): void => {
  cy.fixture('resources/yaml/training-runtime.yaml').then((yamlTemplate) => {
    // Replace placeholders
    let yamlContent = yamlTemplate.replace(/\$\{namespace\}/g, namespace);
    yamlContent = yamlContent.replace(/\$\{trainingRuntimeName\}/g, trainingRuntimeName);

    cy.log(`Creating TrainingRuntime ${trainingRuntimeName} in namespace: ${namespace}`);

    // Write to temp file and apply with failOnNonZeroExit: true to see actual error
    const tempFile = `/tmp/training-runtime-${Date.now()}.yaml`;
    cy.writeFile(tempFile, yamlContent);
    cy.exec(`oc apply -f ${tempFile}`, { failOnNonZeroExit: true, timeout: 30000 }).then(
      (result) => {
        cy.log(`TrainingRuntime created: ${result.stdout}`);
        cy.exec(`rm -f ${tempFile}`, { failOnNonZeroExit: false });
      },
    );
  });
};

/**
 * Creates a TrainJob resource by applying a YAML template.
 *
 * @param namespace - The namespace in which to create the TrainJob.
 * @param trainJobName - The name for the TrainJob resource.
 * @param trainingRuntimeName - The name of the TrainingRuntime to reference.
 */
export const createTrainJob = (
  namespace: string,
  trainJobName: string,
  trainingRuntimeName: string,
  localQueueName: string,
): void => {
  cy.fixture('resources/yaml/train-job.yaml').then((yamlTemplate) => {
    // Replace placeholders
    let yamlContent = yamlTemplate.replace(/\$\{namespace\}/g, namespace);
    yamlContent = yamlContent.replace(/\$\{trainJobName\}/g, trainJobName);
    yamlContent = yamlContent.replace(/\$\{trainingRuntimeName\}/g, trainingRuntimeName);
    yamlContent = yamlContent.replace(/\$\{localQueueName\}/g, localQueueName);

    cy.log(`Creating TrainJob ${trainJobName} in namespace: ${namespace}`);

    // Write to temp file and apply with failOnNonZeroExit: true to see actual error
    const tempFile = `/tmp/train-job-${Date.now()}.yaml`;
    cy.writeFile(tempFile, yamlContent);
    cy.exec(`oc apply -f ${tempFile}`, { failOnNonZeroExit: true, timeout: 30000 }).then(
      (result) => {
        cy.log(`TrainJob created: ${result.stdout}`);
        cy.exec(`rm -f ${tempFile}`, { failOnNonZeroExit: false });
      },
    );
  });
};

/**
 * Deletes a TrainingRuntime resource.
 *
 * @param trainingRuntimeName - The name of the TrainingRuntime to delete.
 * @param namespace - The namespace in which the TrainingRuntime exists.
 * @param options - Configuration options for the deletion operation.
 * @param options.ignoreNotFound - Whether to ignore errors when the resource is not found (default: false).
 * @returns A Cypress chainable resolving with the result of the deletion command.
 */
export const deleteTrainingRuntime = (
  trainingRuntimeName: string,
  namespace: string,
  options: { ignoreNotFound?: boolean } = {},
): Cypress.Chainable<CommandLineResult> => {
  const { ignoreNotFound = false } = options;

  const ocCommand = `oc delete TrainingRuntime ${trainingRuntimeName} -n ${namespace} --ignore-not-found=${ignoreNotFound} --wait=false`;

  cy.log(`Deleting TrainingRuntime: ${trainingRuntimeName}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false, timeout: 120000 }).then((result) => {
    if (result.code !== 0 && !ignoreNotFound) {
      cy.log(`ERROR deleting TrainingRuntime: ${result.stderr}`);
    }
    return result;
  });
};

/**
 * Configuration for setting up training resources.
 */
export interface TrainingResourcesConfig {
  namespace: string;
  trainJobName: string;
  trainingRuntimeName: string;
  flavorName: string;
  clusterQueueName: string;
  localQueueName: string;
  cpuQuota: number;
  memoryQuota: number;
  gpuQuota: number;
}

/**
 * Sets up all training resources: Kueue resources, TrainingRuntime, and TrainJob.
 * This is a convenience function that combines multiple setup steps.
 *
 * @param config - Configuration object containing all required parameters.
 */
export const setupTrainingResources = (config: TrainingResourcesConfig): void => {
  const {
    namespace,
    trainJobName,
    trainingRuntimeName,
    flavorName,
    clusterQueueName,
    localQueueName,
    cpuQuota,
    memoryQuota,
    gpuQuota,
  } = config;

  cy.log(`Setting up training resources in namespace: ${namespace}`);

  // Create Kueue resources
  createTrainingKueueResources(
    flavorName,
    clusterQueueName,
    localQueueName,
    namespace,
    cpuQuota,
    memoryQuota,
    gpuQuota,
  );

  // Create TrainingRuntime
  createTrainingRuntime(namespace, trainingRuntimeName);

  // Create TrainJob
  createTrainJob(namespace, trainJobName, trainingRuntimeName, localQueueName);

  // Verify TrainJob was created
  cy.exec(`oc get trainjob ${trainJobName} -n ${namespace}`, {
    failOnNonZeroExit: false,
    timeout: 30000,
  }).then((result) => {
    if (result.code !== 0) {
      cy.log(`TrainJob verification failed: ${result.stderr}`);
      throw new Error(`TrainJob ${trainJobName} was not created: ${result.stderr}`);
    }
    cy.log(`TrainJob ${trainJobName} exists - setup complete`);
  });
};
