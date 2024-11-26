import type { CommandLineResult } from '~/__tests__/cypress/cypress/types';

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
