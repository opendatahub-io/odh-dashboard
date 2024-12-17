import type { CommandLineResult } from '~/__tests__/cypress/cypress/types';

/**
 * Applies the given YAML content using the `oc apply` command.
 *
 * @param yamlContent YAML content to be applied
 * @returns Cypress Chainable
 */
export const applyOpenShiftYaml = (yamlContent: string): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc apply -f - <<EOF\n${yamlContent}\nEOF`;
  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      // If there is an error, log the error and fail the test
      cy.log(`ERROR applying YAML content
              stdout: ${result.stdout}
              stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
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
): Cypress.Chainable<CommandLineResult> => {
  const namespaceFlag = namespace ? `-n ${namespace}` : '-A';
  const ocCommand = `oc get pods ${namespaceFlag} --no-headers | awk '$2 ~ /^${podNameContains}/ {print $1, $2}' | xargs -tn2 oc wait --for=condition=Ready pod --timeout=${timeout} -n`;
  cy.log(`Executing: ${ocCommand}`);

  return cy
    .exec(ocCommand, { failOnNonZeroExit: false, timeout: 300000 })
    .then((result: CommandLineResult) => {
      if (result.code !== 0) {
        throw new Error(`Pod readiness check failed: ${result.stderr}`);
      }
      cy.log(`Pod is ready: ${result.stdout}`);
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
  const ocCommand = `oc get notebook -A -o custom-columns=":metadata.namespace,:metadata.name" | grep ${notebookNameContains} | xargs -I {} sh -c 'oc delete notebook -n $(echo {} | cut -d " " -f1) $(echo {} | cut -d " " -f2) --ignore-not-found'`;
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
