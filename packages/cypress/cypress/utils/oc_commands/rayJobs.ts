import { createTrainingKueueResources } from './trainingJobs';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

/** Kubernetes DNS label (used for oc resource/namespace arguments). */
const assertK8sName = (value: string, field: string): string => {
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(value)) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return value;
};

/** Single-quote for safe inclusion in sh -c / cy.exec shell strings. */
const shQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

const assertRayJobTempPath = (path: string): string => {
  if (!/^\/tmp\/ray-job-e2e-\d+\.yaml$/.test(path)) {
    throw new Error(`Invalid RayJob apply temp path: ${path}`);
  }
  return path;
};

export type RayJobResourcesConfig = {
  namespace: string;
  rayJobName: string;
  flavorName: string;
  clusterQueueName: string;
  localQueueName: string;
  cpuQuota: number;
  memoryQuota: number;
  gpuQuota: number;
  workerGroupName: string;
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
  workerGroupName: string,
  rayImage: string,
  rayVersion: string,
): void => {
  const ns = assertK8sName(namespace, 'namespace');
  const rj = assertK8sName(rayJobName, 'rayJobName');
  const lq = assertK8sName(localQueueName, 'localQueueName');
  const wg = assertK8sName(workerGroupName, 'workerGroupName');

  cy.fixture('resources/yaml/ray-job-e2e.yaml').then((yamlTemplate: string) => {
    const variables: Record<string, string> = {
      namespace: ns,
      rayJobName: rj,
      localQueueName: lq,
      workerGroupName: wg,
      rayImage,
      rayVersion,
    };
    let yamlContent = yamlTemplate;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      yamlContent = yamlContent.replace(regex, variables[key]);
    });

    cy.log(`Creating RayJob ${rj} in namespace: ${ns}`);

    const tempFile = assertRayJobTempPath(`/tmp/ray-job-e2e-${Date.now()}.yaml`);
    cy.writeFile(tempFile, yamlContent);
    cy.exec(`oc apply -f ${shQuote(tempFile)}`, { failOnNonZeroExit: false, timeout: 60000 }).then(
      (result) => {
        cy.exec(`rm -f ${shQuote(tempFile)}`, { failOnNonZeroExit: false }).then(() => {
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

/**
 * Creates a basic RayJob using the simplified ray-job.yaml template.
 * Used by the project-access permission test (RHOAIENG-56127).
 */
export const createBasicRayJob = (
  namespace: string,
  rayJobName: string,
  rayImage: string,
  localQueueName: string,
): void => {
  cy.fixture('resources/yaml/ray-job.yaml').then((yamlTemplate) => {
    let yamlContent = yamlTemplate.replace(/\$\{namespace\}/g, namespace);
    yamlContent = yamlContent.replace(/\$\{rayJobName\}/g, rayJobName);
    yamlContent = yamlContent.replace(/\$\{rayImage\}/g, rayImage);
    yamlContent = yamlContent.replace(/\$\{localQueueName\}/g, localQueueName);

    cy.log(`Creating RayJob ${rayJobName} in namespace: ${namespace}`);

    const tempFile = `/tmp/ray-job-${Date.now()}.yaml`;
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
    workerGroupName,
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

  createRayJob(namespace, rayJobName, localQueueName, workerGroupName, rayImage, rayVersion);

  const ns = assertK8sName(namespace, 'namespace');
  const rj = assertK8sName(rayJobName, 'rayJobName');

  cy.exec(`oc get rayjob ${rj} -n ${ns}`, {
    failOnNonZeroExit: false,
    timeout: 30000,
  }).then((result) => {
    if (result.code !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      throw new Error(`RayJob ${rj} was not created: ${maskedStderr}`);
    }
    cy.log(`RayJob ${rj} exists - setup complete`);
  });
};

/**
 * Returns worker replicas for the first worker group (index 0), matching our E2E template.
 */
export const getRayJobWorkerReplicas = (
  rayJobName: string,
  namespace: string,
): Cypress.Chainable<number> => {
  const ns = assertK8sName(namespace, 'namespace');
  const rj = assertK8sName(rayJobName, 'rayJobName');

  return cy
    .exec(
      `oc get rayjob ${rj} -n ${ns} -o jsonpath='{.spec.rayClusterSpec.workerGroupSpecs[0].replicas}'`,
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
};

export const verifyRayJobDeleted = (rayJobName: string, namespace: string): void => {
  const ns = assertK8sName(namespace, 'namespace');
  const rj = assertK8sName(rayJobName, 'rayJobName');

  cy.log(`Verifying RayJob ${rj} is deleted from namespace ${ns}`);

  cy.exec(`oc wait --for=delete rayjob/${rj} -n ${ns} --timeout=120s`, {
    failOnNonZeroExit: false,
    timeout: 130000,
  }).then((waitResult) => {
    if (waitResult.code !== 0) {
      const masked = maskSensitiveInfo(waitResult.stderr || waitResult.stdout);
      throw new Error(`Timed out waiting for RayJob deletion: ${masked}`);
    }
  });

  cy.exec(`oc get rayjob ${rj} -n ${ns}`, { failOnNonZeroExit: false }).then((result) => {
    const out = `${result.stderr}\n${result.stdout}`;
    expect(out).to.match(/not found/i);
    cy.log('RayJob successfully deleted');
  });
};

/**
 * Deletes a RayJob resource.
 */
export const deleteRayJob = (
  rayJobName: string,
  namespace: string,
  options: { ignoreNotFound?: boolean } = {},
): Cypress.Chainable<CommandLineResult> => {
  const { ignoreNotFound = false } = options;

  const ocCommand = `oc delete RayJob ${rayJobName} -n ${namespace} --ignore-not-found=${ignoreNotFound} --wait=false`;

  cy.log(`Deleting RayJob: ${rayJobName}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false, timeout: 120000 }).then((result) => {
    if (result.code !== 0 && !ignoreNotFound) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      throw new Error(`Failed to delete RayJob: ${maskedStderr}`);
    }
    return result;
  });
};
