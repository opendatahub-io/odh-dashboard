import type { CommandLineResult } from '~/__tests__/cypress/cypress/types';
import { execWithOutput } from './baseCommands';

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
  return execWithOutput(ocCommand).then(({ exitCode, output }) => {
    if (exitCode !== 0) {
      cy.log(`Failed to retrieve version of ${resourceName}:\n${output}`);
      return cy.wrap<string[]>([]);
    }
    cy.log(`Retrieved version of ${resourceName}:\n${output}`);
    return cy.wrap(output.trim().split(' '));
  });
};

/**
 * Get CSV JSON by its display name.
 *
 * @param displayName - The display name of the product to retrieve the version for.
 * @returns A Cypress.Chainable that resolves to the version of the product.
 * @throws {Error} if no CSV is found with the given display name.
 */
export const getCsvByDisplayName = (
  displayName: string,
  namespace?: string,
): Cypress.Chainable<unknown> => {
  const ocCommand = `oc get csv ${
    namespace ? `-n ${namespace}` : '-A'
  } -o json | jq -r 'first(.items[] | select(.spec.displayName == "${displayName}"))'`;
  return execWithOutput(ocCommand).then(({ exitCode, output }) => {
    if (exitCode !== 0) {
      throw new Error(`Failed to retrieve CSV for display name '${displayName}'\n${output}`);
    }
    return JSON.parse(output.trim());
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
}): Cypress.Chainable<string> => {
  // Remove the unnecessary conditional
  return cy.wrap(csvObject.spec.version);
};

/**
 * Get channel of the first subscription in a given namespace.
 *
 * @param csvObject - The CSV object from which to retrieve the channel.
 * @returns A Cypress.Chainable that resolves to the channel name.
 * @throws {Error} if the CSV format is invalid or no subscription is found in the namespace.
 */
export const getSubscriptionChannelFromCsv = (csvObject: {
  metadata: { annotations: { [key: string]: string } };
}): Cypress.Chainable<string> => {
  // Remove the unnecessary conditional
  // First, retrieve the operator namespace
  const annotation = csvObject.metadata.annotations;
  const operatorNamespace = annotation['olm.operatorNamespace'];
  if (operatorNamespace) {
    // Then, retrieve the channel from the first subscription in that namespace
    const ocCommand = `oc get subs -n ${operatorNamespace} -o jsonpath='{.items[0].spec.channel}'`;
    return execWithOutput(ocCommand).then(({ exitCode, output }) => {
      if (exitCode !== 0) {
        throw new Error(
          `Failed to retrieve subscription in namespace '${operatorNamespace}'\n${output}`,
        );
      }
      return output.trim();
    });
  }
  throw new Error('Failed to retrieve operator namespace from CSV');
};
