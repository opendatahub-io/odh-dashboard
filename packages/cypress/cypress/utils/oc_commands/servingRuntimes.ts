import { createCustomResource } from './customResources';
import { cleanupServingRuntimeTemplate } from './servingRuntimeTemplate';
import type { CommandLineResult } from '../../types';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

/**
 * Deletes the Template wrapping the named ServingRuntime (what the UI reads) plus any
 * bare ServingRuntime object of the same name that may linger from a previous run.
 *
 * @param runtimeName - The metadata.name of the ServingRuntime to clean up.
 */
export const cleanupServingRuntime = (
  runtimeName: string,
): Cypress.Chainable<CommandLineResult> => {
  return cleanupServingRuntimeTemplate(runtimeName).then(() => {
    const ocCommand = `oc get servingruntimes -ojson -n ${applicationNamespace} | jq '.items[] | select(.metadata.name == "${runtimeName}") | .metadata.name' | tr -d '"'`;
    cy.log(`Executing delete serving runtime command: ${ocCommand}`);

    return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      const name = result.stdout.trim();

      if (name) {
        cy.log(`ServingRuntime found: ${name}. Proceeding to delete.`);
        const deleteCommand = `oc delete servingruntimes ${name} -n ${applicationNamespace}`;
        return cy.exec(deleteCommand, { failOnNonZeroExit: false });
      }
      cy.log('No matching ServingRuntime found, proceeding with the test.');
      return cy.wrap(result);
    });
  });
};

/**
 * Creates a clean serving runtime by first deleting any existing Template (and bare
 * ServingRuntime) with the same name, then applying the provided YAML fixture.
 *
 * @param runtimeName - The metadata.name of the ServingRuntime embedded in the Template.
 * @param yamlPath - Path to the fixture YAML file relative to the fixtures directory.
 */
export const createCleanServingRuntime = (runtimeName: string, yamlPath: string): void => {
  cy.log(`Cleaning up and creating ServingRuntime: ${runtimeName}`);
  cleanupServingRuntime(runtimeName).then(() => {
    cy.log(`Creating ServingRuntime Template: ${runtimeName}`);
    createCustomResource(applicationNamespace, yamlPath);
  });
};
