import type { CommandLineResult } from '../../types';

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
    if (result.exitCode !== 0) {
      cy.log(`ERROR creating ConfigMap ${configMapName} in namespace ${namespace}
                  stdout: ${result.stdout}
                  stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.exitCode}`);
    }
    return result;
  });
};

/**
 * ConfigMap the iris pip-index pipeline mounts as PIP_INDEX_URL / PIP_TRUSTED_HOST.
 * No-op when those Cypress env vars are unset.
 */
export const createDsPipelineCustomEnvVarsConfigMap = (
  namespace: string,
): Cypress.Chainable<CommandLineResult> | undefined => {
  const entries: [string, string][] = [];
  const pipIndexUrl = Cypress.env('PIP_INDEX_URL') as string | undefined;
  const pipTrustedHost = Cypress.env('PIP_TRUSTED_HOST') as string | undefined;
  if (pipIndexUrl) {
    entries.push(['pip_index_url', pipIndexUrl]);
  }
  if (pipTrustedHost) {
    entries.push(['pip_trusted_host', pipTrustedHost]);
  }
  if (entries.length === 0) {
    return undefined;
  }
  return createOpenShiftConfigMap(
    'ds-pipeline-custom-env-vars',
    namespace,
    Object.fromEntries(entries),
  );
};
