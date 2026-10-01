import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

/**
 * Waits until the workbench pod is fully Ready using `oc wait`, which is the authoritative
 * Kubernetes readiness gate. This is required before `oc exec` because:
 *
 * - `.state.running` is set as soon as the container PID is forked, but the CRI exec shim
 *   socket may not be active yet, so `oc exec` can still fail.
 * - `.ready` via jsonpath filter `?(@.name=="…")` is unreliable: the Go jsonpath
 *   implementation in `oc` has known bugs where filter expressions on single-element arrays
 *   return the element regardless of whether the filter matches, producing false positives.
 *
 * `oc wait --for=condition=Ready` blocks until the pod's Ready condition is True at the
 * Kubernetes API level, which guarantees the CRI exec endpoint is active.
 */
const waitForPodReady = (namespace: string, podName: string): Cypress.Chainable<void> => {
  // 120s matches the timeout already used in waitForNotebookReady in the test file.
  const waitCmd = `oc wait pod/${podName} -n ${namespace} --for=condition=Ready --timeout=120s`;
  cy.log(`Waiting for pod ${podName} to be Ready via oc wait`);

  return cy.exec(waitCmd, { failOnNonZeroExit: false }).then((result) => {
    if (result.exitCode !== 0) {
      throw new Error(
        `Pod "${podName}" in namespace "${namespace}" did not become Ready within 120s. ` +
          `stderr: ${result.stderr}`,
      );
    }
    cy.log(`✅ Pod ${podName} is Ready.`);
    return cy.wrap(undefined as void);
  });
};

/**
 * Validates environment variables in a workbench pod.
 * Waits for the pod container to be Running before executing oc exec.
 *
 * @param namespace The namespace where the workbench pod is running
 * @param workbench The name of the workbench container
 * @param variablesToCheck Map of environment variable names to expected values
 * @returns Cypress.Chainable that resolves to the result of the validation
 */
export const validateWorkbenchEnvironmentVariables = (
  namespace: string,
  workbench: string,
  variablesToCheck: Record<string, string>,
): Cypress.Chainable<CommandLineResult> => {
  const getPodNameCommand = `oc get pods -n ${namespace} -o custom-columns=NAME:.metadata.name --no-headers | grep ^${workbench}`;
  cy.log(`Executing command: ${getPodNameCommand}`);

  return cy.exec(getPodNameCommand, { failOnNonZeroExit: false }).then((result) => {
    const workbenchPodName = result.stdout.trim();

    if (workbenchPodName) {
      cy.log(
        `Workbench pod found: ${workbenchPodName}. Proceeding to validate environment variables.`,
      );

      // Wait until the pod is fully Ready before attempting oc exec.
      // The Notebook CR "Ready" status visible in the UI can lead the actual pod
      // Ready condition on a loaded cluster, causing oc exec to fail.
      return waitForPodReady(namespace, workbenchPodName).then(() => {
        // Construct grep command for all variables
        const grepPattern = Object.keys(variablesToCheck).join('|');
        const validateEnvVarsCommand = `oc exec -n ${namespace} ${workbenchPodName} -c ${workbench} -- env | grep -E "^(${grepPattern})="`;
        cy.log(`Executing command: ${validateEnvVarsCommand}`);

        return cy.exec(validateEnvVarsCommand, { failOnNonZeroExit: false }).then((envResult) => {
          if (envResult.exitCode !== 0) {
            const maskedStderr = maskSensitiveInfo(envResult.stderr);
            throw new Error(`Failed to validate environment variables: ${maskedStderr}`);
          }

          // Validate each variable's value
          Object.entries(variablesToCheck).forEach(([key, expectedValue]) => {
            const regex = new RegExp(`^${key}=${expectedValue}$`, 'm');
            if (!regex.test(envResult.stdout)) {
              throw new Error(
                `Validation failed for variable: ${key}. Expected value: ${expectedValue}`,
              );
            }
            cy.log(`✅ Variable "${key}" validated with value "${expectedValue}".`);
          });

          return cy.wrap(envResult);
        });
      });
    }

    cy.log('No matching workbench pod found, skipping environment variable validation.');
    return cy.wrap(result);
  });
};

/**
 * Validates tolerations in a workbench pod
 *
 * @param namespace The namespace where the workbench pod is running
 * @param workbenchPrefix The prefix or partial name of the workbench pod
 * @param expectedToleration The toleration to check for, or null if no toleration is expected
 * @param expectPodRunning Whether the pod is expected to be running
 * @returns Cypress.Chainable<string> that resolves to the result of the validation or pod name
 */
export const validateWorkbenchTolerations = (
  namespace: string,
  workbenchPrefix: string,
  expectedToleration: string | null,
  expectPodRunning: boolean,
): Cypress.Chainable<string> => {
  const getPodNameCommand = `oc get pods -n ${namespace} -o custom-columns=NAME:.metadata.name --no-headers | grep ^${workbenchPrefix}`;
  cy.log(`Executing command: ${getPodNameCommand}`);

  return cy.exec(getPodNameCommand, { failOnNonZeroExit: false }).then((result) => {
    const workbenchPodName = result.stdout.trim();

    // Handle case where no pod is found
    if (!workbenchPodName) {
      cy.log(
        `❌ No matching pod found for prefix "${workbenchPrefix}" in namespace "${namespace}".`,
      );
      if (expectPodRunning) {
        throw new Error(`Expected pod to be running, but no matching pod was found.`);
      }
      cy.log('✅ No matching pod found, as expected.');
      return cy.wrap(''); // Return an empty string since no pod is running
    }

    // If a pod is found but it shouldn't be running
    if (!expectPodRunning) {
      throw new Error(`Pod "${workbenchPodName}" is running when it was not expected to be.`);
    }

    cy.log(`Workbench pod found: ${workbenchPodName}. Proceeding to validate tolerations.`);

    const validateTolerationsCommand = `oc describe pod -n ${namespace} ${workbenchPodName}`;
    cy.log(`Executing command: ${validateTolerationsCommand}`);

    return cy
      .exec(validateTolerationsCommand, { failOnNonZeroExit: false })
      .then((tolerationResult) => {
        if (tolerationResult.exitCode !== 0) {
          cy.log(
            `❌ Failed to execute validateTolerationsCommand:\nError: ${tolerationResult.stderr}`,
          );
          throw new Error(
            `Failed to validate tolerations for pod "${workbenchPodName}" in namespace "${namespace}".`,
          );
        }

        // Extract the Tolerations section from the full description
        const tolerationsSection = tolerationResult.stdout
          .split('Tolerations:')[1]
          ?.split('\n')
          .slice(0, 6)
          .join('\n');

        if (expectedToleration) {
          if (!tolerationsSection || !tolerationsSection.includes(expectedToleration)) {
            cy.log(`❌ Full pod description:\n${tolerationResult.stdout}`);
            throw new Error(
              `Expected toleration "${expectedToleration}" not found in pod description for pod "${workbenchPodName}".`,
            );
          }
          cy.log(
            `✅ Toleration "${expectedToleration}" found as expected in pod "${workbenchPodName}".`,
          );
        } else {
          if (tolerationsSection && tolerationsSection.includes('test:NoSchedule op=Exists')) {
            cy.log(`❌ Full pod description:\n${tolerationResult.stdout}`);
            throw new Error(
              `Unexpected toleration "test:NoSchedule op=Exists" found in pod description for pod "${workbenchPodName}".`,
            );
          }
          cy.log(`✅ No unexpected tolerations found in pod "${workbenchPodName}".`);
        }

        return cy.wrap(workbenchPodName);
      });
  });
};
