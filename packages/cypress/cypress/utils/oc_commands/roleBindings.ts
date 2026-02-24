import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

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

  cy.log(`Checking role binding for subject '***' for model registry '${registryName}'`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code === 0 && result.stdout.trim().length > 0) {
      cy.log(`✅ Role binding found for subject '***' for model registry '${registryName}'`);
    } else {
      cy.log(`❌ No role binding found for subject '***' for model registry '${registryName}'`);
    }
    return cy.wrap(result.code === 0 && result.stdout.trim().length > 0);
  });
};

/**
 * Retrieves a ClusterRoleBinding by name.
 *
 * @param clusterRoleBindingName The name of the ClusterRoleBinding to retrieve.
 * @returns A Cypress.Chainable that resolves to the ClusterRoleBinding JSON or empty string if not found.
 */
export const getClusterRoleBinding = (
  clusterRoleBindingName: string,
): Cypress.Chainable<CommandLineResult> => {
  const command = `oc get clusterrolebinding ${clusterRoleBindingName} -o json --ignore-not-found`;
  const maskedName = clusterRoleBindingName.replace(
    /cypress-test-[a-zA-Z0-9-]+(-cluster-admin)?/,
    'cypress-test-***$1',
  );
  cy.log(
    `Getting ClusterRoleBinding: oc get clusterrolebinding ${maskedName} -o json --ignore-not-found`,
  );

  return cy.exec(command, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code === 0 && result.stdout && result.stdout.trim() !== '') {
      cy.log(`Found ClusterRoleBinding: ${maskedName}`);
    } else {
      cy.log(`ClusterRoleBinding not found: ${maskedName}`);
    }
    return cy.wrap(result);
  });
};

/**
 * Deletes a ClusterRoleBinding by name.
 *
 * @param clusterRoleBindingName The name of the ClusterRoleBinding to delete.
 * @returns A Cypress.Chainable that resolves to the command result.
 */
export const deleteClusterRoleBinding = (
  clusterRoleBindingName: string,
): Cypress.Chainable<CommandLineResult> => {
  const command = `oc delete clusterrolebinding ${clusterRoleBindingName} --ignore-not-found`;
  const maskedName = clusterRoleBindingName.replace(
    /cypress-test-[a-zA-Z0-9-]+(-cluster-admin)?/,
    'cypress-test-***$1',
  );
  cy.log(
    `Deleting ClusterRoleBinding: oc delete clusterrolebinding ${maskedName} --ignore-not-found`,
  );

  return cy.exec(command, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code === 0) {
      cy.log(`Successfully deleted ClusterRoleBinding: ${maskedName}`);
    } else {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      cy.log(`Failed to delete ClusterRoleBinding: ${maskedName}`, maskedStderr);
    }
    return cy.wrap(result);
  });
};
