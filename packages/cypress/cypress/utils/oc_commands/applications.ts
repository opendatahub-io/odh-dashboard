import { execWithOutput } from './baseCommands';
import type { CommandLineResult } from '../../types';

/**
 * Executes an OpenShift command to retrieve resource names of a specified kind
 * within a given application namespace.
 *
 * @param applicationNamespace - The namespace in which to search for the resources.
 * @param kind - The kind of resource to retrieve (e.g., 'OdhApplication').
 * @returns A Cypress.Chainable that resolves to an array of resource names.
 */
export const getOcResourceNames = (
  applicationNamespace: string,
  kind: string,
): Cypress.Chainable<string[]> => {
  const ocCommand = `oc get ${kind} -n ${applicationNamespace} -o json`;
  cy.log(`Executing command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.exitCode !== 0 || !result.stdout.trim()) {
      cy.log(`Failed to get ${kind} in ${applicationNamespace}: ${result.stderr}`);
      return cy.wrap([] as string[]);
    }
    const jsonResponse = JSON.parse(result.stdout);
    const metadataNames = jsonResponse.items.map(
      (item: { metadata: { name: string } }) => item.metadata.name,
    );
    return metadataNames;
  });
};

/**
 * Get the version of a resource by its name.
 *
 * @param resourceName - The name of the resource to retrieve the version for.
 * @returns A Cypress.Chainable that resolves to the version of the resource.
 */
export const getResourceVersionByName = (resourceName: string): Cypress.Chainable<string[]> => {
  const ocCommand = `oc get ${resourceName.replace(
    /\s/g,
    '',
  )} -A -o jsonpath='{.items[*].status.releases[*].version}'`;
  return execWithOutput(ocCommand).then(({ exitCode, stdout, stderr }) => {
    if (exitCode !== 0) {
      cy.log(`Failed to retrieve version of ${resourceName}:\n${stdout}\n${stderr}`);
      return cy.wrap<string[]>([]);
    }
    cy.log(`Retrieved version of ${resourceName}:\n${stdout}\n${stderr}`);
    return cy.wrap(stdout.trim().split(' '));
  });
};

/**
 * Get CSV JSON by its display name, considering active subscriptions.
 *
 * @param displayName - The display name of the product to retrieve the CSV for.
 * @returns A Cypress.Chainable that resolves to the CSV of the product.
 * @throws {Error} if no CSV is found with the given display name and active subscription.
 */
export const getCsvByDisplayName = (
  displayName: string,
  namespace?: string,
): Cypress.Chainable<unknown> => {
  const csvCommand = `oc get csv ${
    namespace ? `-n ${namespace}` : '-A'
  } -o json | jq -r '[.items[] | select(.spec.displayName | test("${displayName}")) | select(.status.phase != "Failed")] | first // empty'`;

  return execWithOutput(csvCommand).then(({ exitCode, stdout, stderr }) => {
    if (exitCode !== 0 || !stdout.trim()) {
      throw new Error(
        `Failed to find active non-failed CSV for '${displayName}':\n${stdout}\n${stderr}`,
      );
    }
    return JSON.parse(stdout.trim());
  });
};

/**
 * Auto-detect which product is installed (RHOAI or ODH).
 * Tries both product names and returns the one that's actually installed.
 *
 * @param namespace - Optional namespace to search in
 * @returns A Cypress.Chainable that resolves to the detected product display name
 */
export const getInstalledProductName = (namespace?: string): Cypress.Chainable<string> => {
  const productNames = ['Red Hat OpenShift AI', 'Open Data Hub'];

  // Try RHOAI first by checking if CSV exists
  const rhoaiCsvCommand = `oc get csv ${
    namespace ? `-n ${namespace}` : '-A'
  } -o json | jq -r '[.items[] | select(.spec.displayName | test("${
    productNames[0]
  }")) | select(.status.phase != "Failed")] | first // empty'`;

  return execWithOutput(rhoaiCsvCommand).then(({ exitCode, stdout }) => {
    if (exitCode === 0 && stdout.trim()) {
      Cypress.log({ message: `✓ Detected product: ${productNames[0]}` });
      return cy.wrap(productNames[0]);
    }

    // RHOAI not found, try ODH
    Cypress.log({
      message: `${productNames[0]} not found, trying ${productNames[1]}...`,
    });

    const odhCsvCommand = `oc get csv ${
      namespace ? `-n ${namespace}` : '-A'
    } -o json | jq -r '[.items[] | select(.spec.displayName | test("${
      productNames[1]
    }")) | select(.status.phase != "Failed")] | first // empty'`;

    return execWithOutput(odhCsvCommand).then(({ exitCode: odhExitCode, stdout: odhStdout }) => {
      if (odhExitCode === 0 && odhStdout.trim()) {
        Cypress.log({ message: `✓ Detected product: ${productNames[1]}` });
        return cy.wrap(productNames[1]);
      }

      throw new Error(
        `Failed to detect installed product. Neither RHOAI nor ODH CSV found in namespace: ${
          namespace || 'all namespaces'
        }`,
      );
    });
  });
};

/**
 * Get version of a product from its CSV JSON.
 *
 * @param csvObject - The CSV object from which to retrieve the version.
 * @returns A Cypress.Chainable that resolves to the version of the product.
 * @throws {Error} if the CSV format is invalid.
 */
export const getVersionFromCsv = (csvObject: {
  spec: { version: string };
}): Cypress.Chainable<string> =>
  // Remove the unnecessary conditional
  cy.wrap(csvObject.spec.version);

/**
 * Get the subscription channel that matches the given CSV.
 *
 * @param csvObject - The CSV object from which to retrieve the channel.
 * @returns A Cypress.Chainable that resolves to the channel name.
 * @throws {Error} if the CSV format is invalid or no subscription is found in the namespace.
 */
/**
 * Detect whether the cluster is running ODH or RHOAI by inspecting the
 * rhods-operator OLM Subscription channel.  ODH channels start with "odh"
 * (e.g. "odh-stable"), while RHOAI channels use "fast", "stable", "eus-*", etc.
 *
 * @returns `true` when the cluster is RHOAI, `false` when it is ODH or detection fails.
 */
export const isRHOAI = (): Cypress.Chainable<boolean> => {
  const command = `oc get subscription -A -o json | jq -r '.items[] | select(.spec.name=="rhods-operator") | .spec.channel'`;
  return execWithOutput(command).then(({ exitCode, stdout }) => {
    const channel = stdout.trim();
    if (exitCode !== 0 || !channel || channel.startsWith('odh')) {
      cy.log(`ODH detected (subscription channel="${channel}").`);
      return cy.wrap(false);
    }
    cy.log(`RHOAI confirmed (subscription channel="${channel}").`);
    return cy.wrap(true);
  });
};

export const getSubscriptionChannelFromCsv = (csvObject: {
  metadata: {
    name: string;
    annotations?: { [key: string]: string };
  };
}): Cypress.Chainable<string> => {
  const packageName = csvObject.metadata.name.split('.')[0];
  const ocCommand = `oc get subscription -A -o json | jq -r '.items[] | select(.status.installedCSV != null) | select(.status.installedCSV | test("${packageName}")) | .spec.channel' | head -n 1`;

  return execWithOutput(ocCommand).then(({ exitCode, stdout, stderr }) => {
    if (exitCode !== 0 || !stdout.trim()) {
      throw new Error(
        `Failed to retrieve subscription channel for package '${packageName}'\n${stdout}\n${stderr}`,
      );
    }
    return stdout.trim();
  });
};
