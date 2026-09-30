import { getTrainJobPodStartupStatus, type TrainJobPodList } from './trainingJobSetup';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const K8S_NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const MAX_K8S_NAME_LENGTH = 253;
const TRAIN_JOB_POD_POLL_INTERVAL_MS = 2000;
const TRAIN_JOB_POD_START_TIMEOUT_MS = 120000;

const assertValidK8sName = (value: string, label: string): void => {
  if (!value || value.length > MAX_K8S_NAME_LENGTH || !K8S_NAME_REGEX.test(value)) {
    throw new Error(
      `Invalid ${label} "${value}": must be a lowercase RFC-1123 DNS label (a-z, 0-9, -)`,
    );
  }
};

/**
 * Parses a Go-style time.Duration string (e.g. '300s', '5m', '1h30m10s') into seconds.
 * Supports hours (h), minutes (m), and seconds (s).
 */
const parseGoDurationToSeconds = (duration: string): number => {
  const pattern = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;
  const match = duration.trim().match(pattern);
  if (!match || match[0] === '') {
    throw new Error(
      `Invalid timeout format "${duration}". Use Go duration syntax, e.g. "300s", "5m", or "1h30m".`,
    );
  }
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Verifies that the product-managed CPU runtime required by the E2E fixture is installed.
 * The TrainJob references this runtime directly so its image remains owned and updated by RHOAI.
 */
export const verifyClusterTrainingRuntimeAvailable = (
  trainingRuntimeName: string,
): Cypress.Chainable<CommandLineResult> => {
  assertValidK8sName(trainingRuntimeName, 'trainingRuntimeName');

  return cy
    .exec(`oc get clustertrainingruntime.trainer.kubeflow.org ${trainingRuntimeName} -o name`, {
      failOnNonZeroExit: false,
      timeout: 30000,
    })
    .then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(
          `Training setup failed: required operator-managed ClusterTrainingRuntime ${trainingRuntimeName} is unavailable: ${maskSensitiveInfo(
            result.stderr,
          )}. Verify that the Trainer component is Managed and its default runtimes are installed.`,
        );
      }
      cy.log(`Using operator-managed ClusterTrainingRuntime ${trainingRuntimeName}`);
      return result;
    });
};

/**
 * Waits for every TrainJob worker pod to start and reports persistent image pull failures.
 * This keeps disconnected-registry failures in resource setup instead of surfacing later
 * as a generic timeout while the UI waits for the TrainJob to complete.
 */
const waitForTrainJobWorkerStart = (
  trainJobName: string,
  namespace: string,
): Cypress.Chainable<CommandLineResult> => {
  assertValidK8sName(trainJobName, 'trainJobName');
  assertValidK8sName(namespace, 'namespace');

  const command = `oc get pods -n ${namespace} -l jobset.sigs.k8s.io/jobset-name=${trainJobName} -o json`;
  const startedAt = Date.now();
  let lastImagePullError: string | undefined;

  const poll = (): Cypress.Chainable<CommandLineResult> =>
    cy.exec(command, { failOnNonZeroExit: false, timeout: 30000 }).then((result) => {
      let summary = maskSensitiveInfo(result.stderr) || 'unable to query worker pods';

      if (result.exitCode === 0) {
        let podList: TrainJobPodList;
        try {
          podList = JSON.parse(result.stdout) as TrainJobPodList;
        } catch {
          throw new Error(
            `Training setup failed: received invalid pod status data for TrainJob ${trainJobName}.`,
          );
        }

        const startupStatus = getTrainJobPodStartupStatus(podList);
        summary = startupStatus.summary;

        if (startupStatus.fatalError) {
          throw new Error(maskSensitiveInfo(startupStatus.fatalError));
        }
        if (startupStatus.imagePullError) {
          lastImagePullError = maskSensitiveInfo(startupStatus.imagePullError);
        }
        if (startupStatus.started) {
          cy.log(`TrainJob worker started: ${summary}`);
          return cy.wrap(result);
        }
      }

      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs >= TRAIN_JOB_POD_START_TIMEOUT_MS) {
        if (lastImagePullError) {
          throw new Error(lastImagePullError);
        }
        throw new Error(
          `Training setup failed: worker pods for TrainJob ${trainJobName} did not start within ${Math.ceil(
            elapsedMs / 1000,
          )} seconds. Last observed state: ${summary}`,
        );
      }

      cy.log(`Waiting for TrainJob workers to start: ${summary}`);
      // Polling is required because the Trainer and Kueue controllers create and admit the pod asynchronously.
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(TRAIN_JOB_POD_POLL_INTERVAL_MS, { log: false }).then(() => poll());
    });

  return poll();
};

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
    if (labelResult.exitCode !== 0) {
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

    // Write to temp file and apply
    const tempFile = `/tmp/kueue-resources-${Date.now()}.yaml`;
    cy.writeFile(tempFile, yamlContent);
    cy.exec(`oc apply -f ${tempFile}`, { failOnNonZeroExit: false, timeout: 30000 }).then(
      (result) => {
        // Always cleanup temp file first, then check result
        cy.exec(`rm -f ${tempFile}`, { failOnNonZeroExit: false }).then(() => {
          if (result.exitCode !== 0) {
            const maskedStderr = maskSensitiveInfo(result.stderr);
            throw new Error(`Failed to create Kueue resources: ${maskedStderr}`);
          }
          cy.log(`Kueue resources created: ${result.stdout}`);
        });
      },
    );
  });
};

/**
 * Creates a TrainJob resource by applying a YAML template.
 *
 * @param namespace - The namespace in which to create the TrainJob.
 * @param trainJobName - The name for the TrainJob resource.
 * @param trainingRuntimeName - The name of the ClusterTrainingRuntime to reference.
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

    // Write to temp file and apply
    const tempFile = `/tmp/train-job-${Date.now()}.yaml`;
    cy.writeFile(tempFile, yamlContent);
    cy.exec(`oc apply -f ${tempFile}`, { failOnNonZeroExit: false, timeout: 30000 }).then(
      (result) => {
        // Always cleanup temp file first, then check result
        cy.exec(`rm -f ${tempFile}`, { failOnNonZeroExit: false }).then(() => {
          if (result.exitCode !== 0) {
            const maskedStderr = maskSensitiveInfo(result.stderr);
            throw new Error(`Failed to create TrainJob: ${maskedStderr}`);
          }
          cy.log(`TrainJob created: ${result.stdout}`);
        });
      },
    );
  });
};

/**
 * Retrieves the numNodes value from a TrainJob resource.
 *
 * @param trainJobName - The name of the TrainJob to query.
 * @param namespace - The namespace where the TrainJob exists.
 * @returns A Cypress chainable resolving to the numNodes value.
 */
export const getTrainJobNumNodes = (
  trainJobName: string,
  namespace: string,
): Cypress.Chainable<number> => {
  cy.log(`Getting numNodes for TrainJob ${trainJobName} in namespace ${namespace}`);

  return cy
    .exec(
      `oc get trainjob ${trainJobName} -n ${namespace} -o jsonpath='{.spec.trainer.numNodes}'`,
      {
        failOnNonZeroExit: false,
        timeout: 30000,
      },
    )
    .then((result) => {
      if (result.exitCode !== 0) {
        const maskedStderr = maskSensitiveInfo(result.stderr);
        throw new Error(`Failed to get TrainJob numNodes: ${maskedStderr}`);
      }
      const numNodes = parseInt(result.stdout.replace(/'/g, ''), 10);
      Cypress.log({
        name: 'numNodes',
        message: `TrainJob ${trainJobName} has numNodes: ${numNodes}`,
      });
      return numNodes;
    });
};

/**
 * Verifies that all pods associated with a TrainJob have completed successfully.
 * Uses the `jobset.sigs.k8s.io/jobset-name` label to match pods belonging to the
 * specific TrainJob, consistent with the production code in model-training/src/api/pods.ts.
 *
 * @param trainJobName - The name of the TrainJob whose pods to check.
 * @param namespace - The namespace where the TrainJob pods are running.
 */
export const verifyTrainJobPodsCompleted = (
  trainJobName: string,
  namespace: string,
  timeout = '300s',
): Cypress.Chainable<CommandLineResult> => {
  assertValidK8sName(trainJobName, 'trainJobName');
  assertValidK8sName(namespace, 'namespace');

  const timeoutSeconds = parseGoDurationToSeconds(timeout);
  const cypressTimeout = (timeoutSeconds + 10) * 1000;

  cy.log(`Verifying pods for TrainJob ${trainJobName} in namespace ${namespace} are completed`);

  return cy
    .exec(
      `oc get pods -n ${namespace} -l jobset.sigs.k8s.io/jobset-name=${trainJobName} -o jsonpath='{range .items[*]}{.metadata.name}{"\\n"}{end}'`,
      { failOnNonZeroExit: false, timeout: 30000 },
    )
    .then((result) => {
      if (result.exitCode !== 0) {
        const maskedStderr = maskSensitiveInfo(result.stderr);
        throw new Error(`Failed to get TrainJob pods: ${maskedStderr}`);
      }
      const podNames = result.stdout
        .replace(/'/g, '')
        .trim()
        .split('\n')
        .filter((name: string) => name.trim().length > 0);

      expect(podNames.length).to.be.greaterThan(0, 'Expected at least one pod for the TrainJob');

      // eslint-disable-next-line cypress/unsafe-to-chain-command
      return cy
        .wrap(podNames)
        .each((podName: string) => {
          assertValidK8sName(podName, 'podName');
          const waitCmd = `oc wait --for=jsonpath='{.status.phase}'=Succeeded pod/${podName} -n ${namespace} --timeout=${timeout}`;
          cy.log(`Waiting for pod ${podName} to reach Succeeded`);

          return cy
            .exec(waitCmd, { failOnNonZeroExit: false, timeout: cypressTimeout })
            .then((waitResult) => {
              if (waitResult.exitCode !== 0) {
                return cy
                  .exec(`oc get pod/${podName} -n ${namespace} -o jsonpath='{.status.phase}'`, {
                    failOnNonZeroExit: false,
                  })
                  .then((statusResult) => {
                    const phase = statusResult.stdout.replace(/'/g, '').trim();
                    cy.log(`Pod ${podName} phase: ${phase}`);
                    if (phase === 'Failed') {
                      throw new Error(`Pod ${podName} failed to complete successfully`);
                    }
                    const maskedStderr = maskSensitiveInfo(waitResult.stderr);
                    throw new Error(`Pod ${podName} did not reach Succeeded: ${maskedStderr}`);
                  });
              }
              return cy.log(`Pod ${podName} completed successfully`);
            });
        })
        .then(() => result);
    });
};

/**
 * Verifies that a TrainJob resource has been deleted from the cluster.
 *
 * @param trainJobName - The name of the TrainJob to verify is deleted.
 * @param namespace - The namespace where the TrainJob was located.
 */
export const verifyTrainJobDeleted = (trainJobName: string, namespace: string): void => {
  cy.log(`Verifying TrainJob ${trainJobName} is deleted from namespace ${namespace}`);

  cy.exec(`oc get trainjob ${trainJobName} -n ${namespace}`, {
    failOnNonZeroExit: false,
  }).then((result) => {
    expect(result.exitCode).to.not.equal(0);
    cy.log('Training job successfully deleted');
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
 * Sets up all training resources: Kueue resources and TrainJob.
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

  // Fail before creating resources if the product-managed CPU runtime is unavailable.
  verifyClusterTrainingRuntimeAvailable(trainingRuntimeName);

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

  // Create TrainJob
  createTrainJob(namespace, trainJobName, trainingRuntimeName, localQueueName);

  // Verify TrainJob was created
  cy.exec(`oc get trainjob ${trainJobName} -n ${namespace}`, {
    failOnNonZeroExit: false,
    timeout: 30000,
  }).then((result) => {
    if (result.exitCode !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      cy.log(`TrainJob verification failed: ${maskedStderr}`);
      throw new Error(`TrainJob ${trainJobName} was not created: ${maskedStderr}`);
    }
    cy.log(`TrainJob ${trainJobName} exists - waiting for its worker pod to start`);
    return waitForTrainJobWorkerStart(trainJobName, namespace).then(() => {
      cy.log(`TrainJob ${trainJobName} worker started - setup complete`);
    });
  });
};
