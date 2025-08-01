import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';

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
  // Using printf is safer for handling multi-line strings and special characters than echo.
  // It avoids issues with shell interpretation of the YAML content.
  const ocCommand = `printf '%s' "${yamlContent.replace(/"/g, '\\"')}" | oc apply ${ns} -f -`;

  // We return the result of execWithOutput to benefit from its logging and error handling
  return execWithOutput(ocCommand);
};

/**
 * Applies the NVIDIA NIM OdhApplication manifest to enable NIM on the cluster.
 * This function applies the NIM manifest file directly using oc apply -f.
 * 
 * @param namespace The namespace where the OdhApplication should be applied (default: APPLICATIONS_NAMESPACE)
 * @returns A Cypress chainable that applies the NIM manifest
 */
export const applyNIMApplication = (
  namespace: string = Cypress.env('APPLICATIONS_NAMESPACE'),
): Cypress.Chainable<CommandLineResult> => {
  cy.log('Applying NVIDIA NIM OdhApplication manifest...');
  
  // Debug: Check current directory and navigate to odh-dashboard root
  return cy.exec('pwd').then((pwdResult) => {
    cy.log(`Current working directory: ${pwdResult.stdout.trim()}`);
    
    // Navigate to the odh-dashboard root (6 levels up from cypress directory)
    return cy.exec('cd ../../../../../.. && pwd').then((rootResult) => {
      cy.log(`Odh-dashboard root directory: ${rootResult.stdout.trim()}`);
      
      // Now look for the manifest file from the root
      return cy.exec('cd ../../../../../.. && find . -name "nvidia-nim-app.yaml" -type f').then((findResult) => {
        cy.log(`Manifest search from root: ${findResult.stdout}`);
        
        if (findResult.code !== 0 || !findResult.stdout.trim()) {
          cy.log('❌ Could not find nvidia-nim-app.yaml file in odh-dashboard root');
          cy.log(`Find command output: ${findResult.stdout}`);
          cy.log(`Find command error: ${findResult.stderr}`);
          
          // Try to list the manifests directory from root
          return cy.exec('cd ../../../../../.. && ls -la manifests/ 2>/dev/null || echo "manifests/ not found"').then((lsResult) => {
            cy.log(`manifests/ directory contents from root: ${lsResult.stdout}`);
            
            throw new Error('NIM manifest file not found. Please ensure the file exists in the repository.');
          });
        }
        
        const manifestPath = findResult.stdout.trim();
        cy.log(`Found manifest file at: ${manifestPath}`);
        
        const ns = namespace ? `-n ${namespace}` : '';
        const ocCommand = `cd ../../../../../.. && oc apply -f ${manifestPath} ${ns}`;
        
        cy.log(`Executing: ${ocCommand}`);
        return execWithOutput(ocCommand);
      });
    });
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

/**
 * Deletes odh-nim-account in the APPLICATIONS_NAMESPACE.
 * @param namespace The namespace where account exist.
 * @returns A Cypress chainable that performs the account deletion process.
 */
export const deleteNIMAccount = (
  namespace: string = Cypress.env('APPLICATIONS_NAMESPACE'),
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc delete account odh-nim-account -n ${namespace}`;
  cy.log(`Executing: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      throw new Error(`Command failed with code ${result.stderr}`);
    }
    if (result.stdout.trim() === '') {
      cy.log('No accounts found');
    } else {
      cy.log(`Account deletion: ${result.stdout}`);
    }
  });
};
