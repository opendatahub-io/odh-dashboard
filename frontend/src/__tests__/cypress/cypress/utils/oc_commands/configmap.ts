import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';

/**
 * Create an OpenShift ConfigMap
 *
 * This function creates a ConfigMap in the specified OpenShift namespace with the provided key-value pairs.
 *
 * @param configMapName Name of the ConfigMap to be created
 * @param namespace Namespace in which the ConfigMap will be created
 * @param keyValues An object containing key-value pairs to include in the ConfigMap
 *                    Each key will be used as the ConfigMap variable, and the corresponding value as its value.
 * @returns Cypress.Chainable<CommandLineResult> - Result object of the `oc` command execution
 * @throws Error - If the `oc create configmap` command fails
 */
export const createOpenShiftConfigMap = (
  configMapName: string,
  namespace: string,
  keyValues: Record<string, string>, // Object of key-value pairs
): Cypress.Chainable<CommandLineResult> => {
  // Build the `--from-literal` arguments dynamically
  const literals = Object.entries(keyValues)
    .map(([key, value]) => `--from-literal=${key}=${value}`)
    .join(' ');
  const ocCommand = `oc create configmap ${configMapName} -n ${namespace} ${literals}`;

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    if (result.code !== 0) {
      cy.log(`ERROR creating ConfigMap ${configMapName} in namespace ${namespace}
                  stdout: ${result.stdout}
                  stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};

/**
 * Check if metrics dashboard ConfigMap exists for a model
 * Similar to Robot Framework: oc get cm -n ${TEST_NS} ${MODEL_NAME}-metrics-dashboard
 */
export const checkMetricsDashboardConfigMap = (modelName: string, namespace: string): void => {
  const configMapName = `${modelName}-metrics-dashboard`;

  cy.exec(`oc get cm -n ${namespace} ${configMapName} -o jsonpath='{.data.supported}'`, {
    failOnNonZeroExit: false,
  }).then((result) => {
    cy.log(`Metrics ConfigMap check result: ${JSON.stringify(result)}`);

    if (result.code === 0) {
      // ConfigMap exists, check if metrics are supported
      const isSupported = result.stdout.trim() === 'true';
      if (!isSupported) {
        throw new Error(
          `Metrics dashboard is not supported or ConfigMap missing for model: ${modelName}`,
        );
      }
      cy.log(`✅ Metrics dashboard is supported and properly configured for model: ${modelName}`);
    } else {
      throw new Error(`ConfigMap missing for model: ${modelName}`);
    }
  });
};
