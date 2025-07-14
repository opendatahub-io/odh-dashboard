import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';

/**
 * Check if a role binding exists for a specific subject in a model registry
 * @param registryName Name of the model registry
 * @param namespace Namespace to check
 * @param subjectName Specific user, group, or project name to check for
 * @returns A Cypress chainable that resolves to true if role binding exists for the subject
 */
export const checkModelRegistryRoleBindings = (
  registryName: string,
  namespace: string,
  subjectName: string,
): Cypress.Chainable<boolean> => {
  const ocCommand = `oc get rolebinding --selector="app.kubernetes.io/name=${registryName}" -n ${namespace} -o json | jq -r '.items[] | select(.subjects[]?.name == "${subjectName}") | .metadata.name'`;

  cy.log(`Checking role binding for subject '${subjectName}' for model registry '${registryName}'`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code === 0 && result.stdout.trim().length > 0) {
      cy.log(
        `✅ Role binding found for subject '${subjectName}' for model registry '${registryName}'`,
      );
    } else {
      cy.log(
        `❌ No role binding found for subject '${subjectName}' for model registry '${registryName}'`,
      );
    }
    return cy.wrap(result.code === 0 && result.stdout.trim().length > 0);
  });
};
