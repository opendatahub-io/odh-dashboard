import type { CommandLineResult } from '../../types';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

/**
 * `deleteConnectionTypeByName` deletes a Connection Type ConfigMap by its exact name.
 *
 * @param connectionTypeName - The exact `metadata.name` of the Connection Type ConfigMap to delete.
 * @param namespace - Optional namespace. Defaults to APPLICATIONS_NAMESPACE.
 * @returns A Cypress.Chainable that resolves to the CommandLineResult of the deletion command.
 */
export const deleteConnectionTypeByName = (
  connectionTypeName: string,
  namespace: string = applicationNamespace,
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc delete configmap ${connectionTypeName} -n ${namespace} --ignore-not-found`;
  cy.log(`Executing delete connection type command: ${ocCommand}`);
  return cy.exec(ocCommand, { failOnNonZeroExit: false });
};
