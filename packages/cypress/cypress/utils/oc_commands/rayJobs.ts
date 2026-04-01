import { createTrainingKueueResources } from './trainingJobs';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

export type RayJobResourcesConfig = {
  namespace: string;
  rayJobName: string;
  flavorName: string;
  clusterQueueName: string;
  localQueueName: string;
  cpuQuota: number;
  memoryQuota: number;
  gpuQuota: number;
  rayImage: string;
  rayVersion: string;
};

/**
 * Applies the RayJob E2E template (Kueue queue label + lifecycle RayJob with embedded RayCluster).
 */
export const createRayJob = (
  namespace: string,
  rayJobName: string,
  localQueueName: string,
  rayImage: string,
  rayVersion: string,
): void => {
  cy.fixture('resources/yaml/ray-job-e2e.yaml').then((yamlTemplate: string) => {
    const variables: Record<string, string> = {
      namespace,
      rayJobName,
      localQueueName,
      rayImage,
      rayVersion,
    };
    let yamlContent = yamlTemplate;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      yamlContent = yamlContent.replace(regex, variables[key]);
    });

    cy.log(`Creating RayJob ${rayJobName} in namespace: ${namespace}`);

    const tempFile = `/tmp/ray-job-e2e-${Date.now()}.yaml`;
    cy.writeFile(tempFile, yamlContent);
    cy.exec(`oc apply -f ${tempFile}`, { failOnNonZeroExit: false, timeout: 60000 }).then(
      (result) => {
        cy.exec(`rm -f ${tempFile}`, { failOnNonZeroExit: false }).then(() => {
          if (result.code !== 0) {
            const maskedStderr = maskSensitiveInfo(result.stderr);
            throw new Error(`Failed to create RayJob: ${maskedStderr}`);
          }
          cy.log(`RayJob created: ${result.stdout}`);
        });
      },
    );
  });
};

export const setupRayJobResources = (config: RayJobResourcesConfig): void => {
  const {
    namespace,
    rayJobName,
    flavorName,
    clusterQueueName,
    localQueueName,
    cpuQuota,
    memoryQuota,
    gpuQuota,
    rayImage,
    rayVersion,
  } = config;

  cy.log(`Setting up RayJob resources in namespace: ${namespace}`);

  createTrainingKueueResources(
    flavorName,
    clusterQueueName,
    localQueueName,
    namespace,
    cpuQuota,
    memoryQuota,
    gpuQuota,
  );

  createRayJob(namespace, rayJobName, localQueueName, rayImage, rayVersion);

  cy.exec(`oc get rayjob ${rayJobName} -n ${namespace}`, {
    failOnNonZeroExit: false,
    timeout: 30000,
  }).then((result) => {
    if (result.code !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      throw new Error(`RayJob ${rayJobName} was not created: ${maskedStderr}`);
    }
    cy.log(`RayJob ${rayJobName} exists - setup complete`);
  });
};

/**
 * Returns worker replicas for the first worker group (index 0), matching our E2E template.
 */
export const getRayJobWorkerReplicas = (
  rayJobName: string,
  namespace: string,
): Cypress.Chainable<number> =>
  cy
    .exec(
      `oc get rayjob ${rayJobName} -n ${namespace} -o jsonpath='{.spec.rayClusterSpec.workerGroupSpecs[0].replicas}'`,
      { failOnNonZeroExit: false, timeout: 30000 },
    )
    .then((result) => {
      if (result.code !== 0) {
        const maskedStderr = maskSensitiveInfo(result.stderr);
        throw new Error(`Failed to read RayJob worker replicas: ${maskedStderr}`);
      }
      const n = parseInt(result.stdout.replace(/'/g, '').trim(), 10);
      if (Number.isNaN(n)) {
        throw new Error(`Invalid replicas value: ${result.stdout}`);
      }
      return n;
    });

export const verifyRayJobDeleted = (rayJobName: string, namespace: string): void => {
  cy.log(`Verifying RayJob ${rayJobName} is deleted from namespace ${namespace}`);

  cy.exec(`oc get rayjob ${rayJobName} -n ${namespace}`, { failOnNonZeroExit: false }).then(
    (result) => {
      expect(result.code).to.not.equal(0);
      cy.log('RayJob successfully deleted');
    },
  );
};
