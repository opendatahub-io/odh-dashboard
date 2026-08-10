import { pollUntilSuccess } from './baseCommands';
import type { CommandLineResult } from '../../types';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

export type WaitForTemplateOptions = {
  maxAttempts?: number;
  pollIntervalMs?: number;
};

/**
 * Waits until a template exists in the cluster whose nested ServingRuntime object has
 * `metadata.name` containing the provided ServingRuntime name.
 *
 * This is useful for verifying that the backend successfully created the Template after submitting
 * the Serving Runtime form.
 */
export const waitForTemplateByDisplayName = (
  servingRuntimeName: string,
  { maxAttempts = 30, pollIntervalMs = 2000 }: WaitForTemplateOptions = {},
): Cypress.Chainable<Cypress.Exec> => {
  const cmd = `oc get templates -ojson -n ${applicationNamespace} | jq -e --arg name "${servingRuntimeName}" '.items[] | select(.objects[]? | select(.kind == "ServingRuntime") | .metadata?.name? // "" | contains($name)) | .metadata.name' >/dev/null`;
  return pollUntilSuccess(cmd, `template containing ServingRuntime name "${servingRuntimeName}"`, {
    maxAttempts,
    pollIntervalMs,
  });
};

/**
 * Cleans up OpenShift templates by searching for a template whose nested ServingRuntime object
 * has the provided resource name.
 * If a matching template is found, it deletes the template; otherwise, it logs a message
 * and continues with the test execution.
 *
 * @param servingRuntimeName - The nested ServingRuntime metadata.name to search for in Template.objects.
 * @returns A Cypress.Chainable that resolves to the result of the delete command or
 *          the original command execution result if no matching template is found.
 */
export const cleanupTemplates = (
  servingRuntimeName: string,
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc get templates -ojson -n ${applicationNamespace} | jq '.items[] | select(.objects[]? | select(.kind == "ServingRuntime") | .metadata?.name? // "" | contains("${servingRuntimeName}")) | .metadata.name' | tr -d '"'`;
  cy.log(`Executing command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    const templateName = result.stdout.trim();

    if (templateName) {
      cy.log(`Template found: ${templateName}. Proceeding to delete.`);
      const deleteCommand = `oc delete template ${templateName} -n ${applicationNamespace}`;
      return cy.exec(deleteCommand, { failOnNonZeroExit: false });
    }
    cy.log('No matching template found, proceeding with the test.');
    return cy.wrap(result);
  });
};
