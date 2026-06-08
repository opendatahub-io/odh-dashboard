import type { CommandLineResult } from '../../types';

const getApplicationsNamespace = (): string => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  if (!namespace) {
    throw new Error(
      'APPLICATIONS_NAMESPACE is not configured. Set CY_TEST_CONFIG to point to your test-variables.yml file.',
    );
  }
  return namespace;
};

/**
 * Deletes a cluster-scoped serving runtime Template that embeds the given ServingRuntime name.
 */
export const cleanupServingRuntimeTemplate = (
  servingRuntimeName: string,
): Cypress.Chainable<CommandLineResult> => {
  const namespace = getApplicationsNamespace();

  const jqFilter = `.items[] | select(.objects[]? | select(.kind == "ServingRuntime" and .metadata.name == "${servingRuntimeName}")) | .metadata.name`;
  const findCommand = `oc get templates -ojson -n ${namespace} | jq -r '${jqFilter}'`;

  cy.log(`Searching for template with ServingRuntime: ${servingRuntimeName}`);

  return cy.exec(findCommand, { failOnNonZeroExit: false }).then((result) => {
    const templateName = result.stdout.trim();

    if (templateName) {
      cy.log(`Template found: ${templateName}. Proceeding to delete.`);
      return cy.exec(`oc delete template ${templateName} -n ${namespace}`, {
        failOnNonZeroExit: false,
      });
    }

    cy.log('No matching serving runtime template found.');
    return cy.wrap(result);
  });
};
