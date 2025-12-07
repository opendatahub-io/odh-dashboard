import type { CommandLineResult } from '../../types';

/**
 * Run a command and return the result exitCode and output (including stderr).
 * @param command The command to run.
 * @param timeout Timeout in seconds for the command execution (default: 60).
 * @returns A Cypress chainable that resolves to an object with `exitCode` and `output` properties.
 */
export const execWithOutput = (
  command: string,
  timeout = 60,
): Cypress.Chainable<CommandLineResult> => {
  // Convert seconds to milliseconds for Cypress
  const timeoutMs = timeout * 1000;

  return cy
    .exec(command, { failOnNonZeroExit: false, timeout: timeoutMs })
    .then((result: CommandLineResult | null) => {
      if (!result) {
        // Provide a default CommandLineResult shape using cy.wrap
        return cy.wrap({ code: 0, stdout: '', stderr: '' });
      }
      cy.log(`Command exit code: ${result.code}`);
      return cy.wrap(result);
    });
};

/**
 * Applies the given YAML content using the `oc apply` command.
 *
 * @param yamlContent YAML content to be applied
 * @returns Cypress Chainable
 */
export const applyOpenShiftYaml = (
  yamlContent: string,
  namespace?: string,
): Cypress.Chainable<CommandLineResult> => {
  const ns = namespace ? `-n ${namespace}` : '';
  // Create a temporary file to avoid logging sensitive content
  const tempFileName = `/tmp/cypress-yaml-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}.yaml`;

  // Write YAML content to temp file using Node.js fs to avoid logging
  return cy.writeFile(tempFileName, yamlContent).then(() => {
    const ocCommand = `oc apply ${ns} -f ${tempFileName} && rm -f ${tempFileName}`;
    return execWithOutput(ocCommand);
  });
};

/**
 * Patches an OpenShift resource using the `oc patch` command.
 *
 * @param resourceType The type of resource to patch (e.g., 'storageclass')
 * @param resourceName The name of the resource to patch
 * @param patchContent The patch content as a JSON string
 * @returns Cypress Chainable
 */
export const patchOpenShiftResource = (
  resourceType: string,
  resourceName: string,
  patchContent: string,
): Cypress.Chainable<CommandLineResult> => {
  // Escape single quotes in the patch content
  const escapedPatchContent = patchContent.replace(/'/g, "'\\''");

  const ocCommand = `oc patch ${resourceType} ${resourceName} --type=merge -p '${escapedPatchContent}'`;

  cy.log(ocCommand);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      // If there is an error, log the error and fail the test
      cy.log(`ERROR patching ${resourceType} ${resourceName}
              stdout: ${result.stdout}
              stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};

/**
 * Wait for a specific pod to become ready across all namespaces.
 *
 * @param podNameContains A substring to partially match against the pod name (e.g., "jupyter-nb").
 * @returns A Cypress chainable that waits for the pod to be ready.
 * @param timeout The amount of time to wait for the pod to become ready (default is 10 seconds, e.g., '10s', '30m').
 * @param namespace The namespace to search for the pod. Defaults to `-A` for all namespaces, or can specify a specific namespace with `-n <namespace>`.
 */
export const waitForPodReady = (
  podNameContains: string,
  timeout = '10s',
  namespace?: string,
  waitTimeBeforeParsing = 10000,
): Cypress.Chainable<CommandLineResult> => {
  const namespaceFlag = namespace ? `-n ${namespace}` : '-A';

  // find pods
  const findPodsCommand = `oc get pods ${namespaceFlag} -o custom-columns="NAMESPACE:.metadata.namespace,NAME:.metadata.name" --no-headers | grep ${podNameContains}`;
  cy.log(`Finding pods with command: ${findPodsCommand}`);

  // wait before parsing the result
  cy.wait(waitTimeBeforeParsing);
  return cy
    .exec(findPodsCommand, { failOnNonZeroExit: false })
    .then((result: CommandLineResult) => {
      const pods = result.stdout
        .trim()
        .split('\n')
        .map((line) => {
          // parse the result
          const parsedResult = line.trim().split(/\s+/);
          if (parsedResult.length === 2) {
            const [podNamespace, podName] = parsedResult;
            cy.log(`Parsed: namespace = ${podNamespace}, podName = ${podName}`);
            return { namespace: podNamespace, name: podName };
          }

          cy.log(`Error parsing line: "${line}"`);
          return null;
        })
        .filter((pod): pod is { namespace: string; name: string } => pod !== null);

      cy.log(`Found ${pods.length} matching pods`);

      if (pods.length === 0) {
        cy.log('No matching pods found');
        return;
      }

      // loop through matching pods and wait for ready state
      pods.forEach((pod) => {
        const { namespace: podNamespace, name: podName } = pod;

        // wait for each pod to be ready
        const waitForPodCommand = `oc wait --for=condition=Ready pod/${podName} -n ${podNamespace} --timeout=${timeout}`;
        cy.log(`Executing command to wait for pod readiness: ${waitForPodCommand}`);

        cy.exec(waitForPodCommand, { failOnNonZeroExit: false, timeout: 300000 }).then(
          (waitResult: CommandLineResult) => {
            if (waitResult.code !== 0) {
              cy.log(`Pod readiness check failed: ${waitResult.stderr}`);
            } else {
              cy.log(`Pod is ready: ${waitResult.stdout}`);
            }
          },
        );
      });
    });
};

/**
 * Wait for a specific pod to complete (succeed or fail) across all namespaces.
 * Useful for job-like pods with restartPolicy: Never that exit after completing their task.
 *
 * @param podNameContains A substring to partially match against the pod name (e.g., "pvc-loader-pod").
 * @param timeout The amount of time to wait for the pod to complete (default is 300 seconds, e.g., '300s', '10m').
 * @param namespace The namespace to search for the pod. Defaults to `-A` for all namespaces, or can specify a specific namespace with `-n <namespace>`.
 * @param waitTimeBeforeParsing Time to wait before parsing the result (default 10000ms).
 * @returns A Cypress chainable that waits for the pod to complete.
 */
export const waitForPodCompletion = (
  podNameContains: string,
  timeout = '300s',
  namespace?: string,
  waitTimeBeforeParsing = 10000,
): Cypress.Chainable<CommandLineResult> => {
  const namespaceFlag = namespace ? `-n ${namespace}` : '-A';

  // find pods
  const findPodsCommand = `oc get pods ${namespaceFlag} -o custom-columns="NAMESPACE:.metadata.namespace,NAME:.metadata.name" --no-headers | grep ${podNameContains}`;
  cy.log(`Finding pods with command: ${findPodsCommand}`);

  // wait before parsing the result
  cy.wait(waitTimeBeforeParsing);
  return cy
    .exec(findPodsCommand, { failOnNonZeroExit: false })
    .then((result: CommandLineResult) => {
      const pods = result.stdout
        .trim()
        .split('\n')
        .map((line) => {
          // parse the result
          const parsedResult = line.trim().split(/\s+/);
          if (parsedResult.length === 2) {
            const [podNamespace, podName] = parsedResult;
            cy.log(`Parsed: namespace = ${podNamespace}, podName = ${podName}`);
            return { namespace: podNamespace, name: podName };
          }

          cy.log(`Error parsing line: "${line}"`);
          return null;
        })
        .filter((pod): pod is { namespace: string; name: string } => pod !== null);

      cy.log(`Found ${pods.length} matching pods`);

      if (pods.length === 0) {
        cy.log('No matching pods found');
        return;
      }

      // loop through matching pods and wait for completion
      pods.forEach((pod) => {
        const { namespace: podNamespace, name: podName } = pod;

        // wait for each pod to complete (either succeed or fail)
        const waitForPodCommand = `oc wait --for=jsonpath='{.status.phase}'=Succeeded pod/${podName} -n ${podNamespace} --timeout=${timeout}`;
        cy.log(`Executing command to wait for pod completion: ${waitForPodCommand}`);

        cy.exec(waitForPodCommand, { failOnNonZeroExit: false, timeout: 300000 }).then(
          (waitResult: CommandLineResult) => {
            if (waitResult.code !== 0) {
              cy.log(`Pod completion check failed: ${waitResult.stderr}`);
              // Check if pod failed instead of succeeded
              const checkFailedCommand = `oc get pod/${podName} -n ${podNamespace} -o jsonpath='{.status.phase}'`;
              cy.exec(checkFailedCommand).then((statusResult: CommandLineResult) => {
                cy.log(`Pod status: ${statusResult.stdout}`);
                if (statusResult.stdout === 'Failed') {
                  throw new Error(`Pod ${podName} failed to complete successfully`);
                }
              });
            } else {
              cy.log(`Pod completed successfully: ${waitResult.stdout}`);
            }
          },
        );
      });
    });
};

/**
 * Deletes notebooks matching a given name pattern across all namespaces.
 *
 * @param notebookNameContains A substring to match against the notebook name (e.g., "jupyter-nb").
 * @returns A Cypress chainable that performs the notebook deletion process.
 */
export const deleteNotebook = (
  notebookNameContains: string,
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc get notebooks.kubeflow.org -A -o custom-columns=":metadata.namespace,:metadata.name" | grep ${notebookNameContains} | xargs -I {} sh -c 'oc delete notebook.kubeflow.org -n $(echo {} | cut -d " " -f1) $(echo {} | cut -d " " -f2) --ignore-not-found'`;
  cy.log(`Executing: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      throw new Error(`Command failed with code ${result.stderr}`);
    }
    if (result.stdout.trim() === '') {
      cy.log('No notebooks found');
    } else {
      cy.log(`Notebook deletion: ${result.stdout}`);
    }
  });
};

type PollOptions = {
  maxAttempts?: number;
  pollIntervalMs?: number;
};

/**
 * Generic polling utility that retries a command until it succeeds.
 * Polls until the command returns exit code 0 or max attempts is reached.
 *
 * @param command The shell command to execute.
 * @param description A human-readable description of what we're waiting for.
 * @param options Polling options (maxAttempts, pollIntervalMs).
 * @returns A Cypress chainable that resolves when the command succeeds.
 */
export const pollUntilSuccess = (
  command: string,
  description: string,
  { maxAttempts = 30, pollIntervalMs = 2000 }: PollOptions = {},
): Cypress.Chainable<Cypress.Exec> => {
  const startTime = Date.now();
  const totalTimeout = maxAttempts * pollIntervalMs;

  const check = (attemptNumber = 1): Cypress.Chainable<Cypress.Exec> => {
    return cy.exec(command, { failOnNonZeroExit: false }).then((result) => {
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      if (result.code === 0) {
        cy.log(`✅ ${description} (found after ${elapsedTime}s)`);
        return cy.wrap(result);
      }

      if (attemptNumber >= maxAttempts) {
        throw new Error(`${description} not found after ${maxAttempts} attempts (${elapsedTime}s)`);
      }

      cy.log(
        `⏳ Waiting for ${description} (attempt ${attemptNumber}/${maxAttempts}, elapsed: ${elapsedTime}s)`,
      );
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
    });
  };

  cy.log(`🔍 Polling for ${description} (max ${totalTimeout / 1000}s)`);
  return check();
};

/**
 * Wait for a specific OpenShift resource to exist by polling with `oc get`.
 * Polls until the resource exists or max attempts is reached.
 *
 * @param resourceType The type of resource to check (e.g., 'inferenceService', 'configmap', 'pod').
 * @param resourceName The name of the resource to wait for.
 * @param namespace The namespace where the resource should exist.
 * @param maxAttempts The maximum number of attempts to check for the resource (default: 30).
 * @param pollIntervalMs The interval between polling attempts in milliseconds (default: 2000).
 * @returns A Cypress chainable that resolves when the resource exists.
 */
export const waitForResource = (
  resourceType: string,
  resourceName: string,
  namespace: string,
  maxAttempts = 30,
  pollIntervalMs = 2000,
): Cypress.Chainable<Cypress.Exec> =>
  pollUntilSuccess(
    `oc get ${resourceType} ${resourceName} -n ${namespace}`,
    `${resourceType}/${resourceName} in namespace ${namespace}`,
    { maxAttempts, pollIntervalMs },
  );

/**
 * Wait for a namespace to exist in the cluster by polling with `oc get namespace`.
 * Polls until the namespace exists or max attempts is reached.
 *
 * @param namespaceName The name of the namespace to wait for.
 * @param maxAttempts The maximum number of attempts to check for the namespace (default: 60).
 * @param pollIntervalMs The interval between polling attempts in milliseconds (default: 2000).
 * @returns A Cypress chainable that resolves when the namespace exists.
 */
export const waitForNamespace = (
  namespaceName: string,
  maxAttempts = 60,
  pollIntervalMs = 2000,
): Cypress.Chainable<Cypress.Exec> =>
  pollUntilSuccess(`oc get namespace ${namespaceName}`, `namespace ${namespaceName}`, {
    maxAttempts,
    pollIntervalMs,
  });
