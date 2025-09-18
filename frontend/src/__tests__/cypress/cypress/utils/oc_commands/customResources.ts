import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';

/**
 * Create a custom resource in a specified namespace using a YAML file.
 *
 * @param resourceNamespace The namespace where the resource will be created.
 * @param customYaml The path to the YAML file defining the custom resource.
 * @param kind The kind/type of the resource (e.g., Deployment, Service).
 * @returns A Cypress chainable that executes the command to create the resource.
 */
export const createCustomResource = (
  resourceNamespace: string,
  customYamlPath: string,
): Cypress.Chainable<CommandLineResult> =>
  cy.fixture(customYamlPath).then((yamlContent) => {
    // Write the YAML content to a temporary file
    const tempFilePath = `/tmp/temp_${Date.now()}.yaml`;
    cy.writeFile(tempFilePath, yamlContent);

    const ocCommand = `oc apply -f "${tempFilePath}" -n ${resourceNamespace}`;
    cy.log(`Executing command: ${ocCommand}`);

    return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      if (result.code !== 0) {
        cy.log(`Error executing command: ${ocCommand}`);
        cy.log(`Error output: ${result.stderr}`);
      } else {
        cy.log(`Command executed successfully: ${result.stdout}`);
      }

      // Clean up the temporary file
      cy.exec(`rm ${tempFilePath}`);

      return cy.wrap(result);
    });
  });

/**
 * Retrieve a custom resource from a specified namespace using label selectors.
 *
 * @param resourceNamespace The namespace from which to retrieve the resource.
 * @param kind The kind/type of the resource to retrieve.
 * @param labelSelector The label selector used to filter resources.
 * @returns A Cypress chainable that executes the command to get the resource.
 */
export const getCustomResource = (
  resourceNamespace: string,
  kind: string,
  labelSelector: string,
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc get ${kind} -l ${labelSelector} -n ${resourceNamespace}`;
  cy.log(`Executing command: ${ocCommand}`);
  return cy.exec(ocCommand, { failOnNonZeroExit: false });
};

/**
 * Delete a custom resource in a specified namespace using label selectors.
 *
 * @param namespace The namespace where the resource will be deleted from.
 * @param kind The kind/type of the resource to delete.
 * @param labelSelector The label selector used to identify resources for deletion.
 * @returns A Cypress chainable that executes the command to delete the resource.
 */
export const deleteCustomResource = (
  namespace: string,
  kind: string,
  labelSelector: string,
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc delete ${kind} -n ${namespace} -l ${labelSelector}`;
  cy.log(`Executing command: ${ocCommand}`);
  return cy.exec(ocCommand, { failOnNonZeroExit: false });
};
