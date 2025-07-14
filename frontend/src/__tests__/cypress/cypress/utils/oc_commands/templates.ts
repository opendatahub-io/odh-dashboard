import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

/**
 * Cleans up OpenShift templates by searching for a template with a specific display name.
 * If a matching template is found, it deletes the template; otherwise, it logs a message
 * and continues with the test execution.
 *
 * @param displayName - The display name to search for in the template annotations.
 * @returns A Cypress.Chainable that resolves to the result of the delete command or
 *          the original command execution result if no matching template is found.
 */
export const cleanupTemplates = (displayName: string): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc get templates -ojson -n ${applicationNamespace} | jq '.items[] | select(.objects[].metadata.annotations."openshift.io/display-name" | contains("${displayName}")) | .metadata.name' | tr -d '"'`;
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
