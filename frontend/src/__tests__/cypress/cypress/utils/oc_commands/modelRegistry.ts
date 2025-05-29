/**
 * Utility functions for Model Registry OC commands
 */

/**
 * Check if a model registry exists in any namespace
 * @param registryName Name of the model registry to check
 * @returns Cypress.Chainable<boolean> that resolves to true if the registry exists
 */
export const checkModelRegistry = (registryName: string): Cypress.Chainable<boolean> => {
  const command = `oc get modelregistry.modelregistry.opendatahub.io --all-namespaces | grep ${registryName}`;
  cy.log(`Running command: ${command}`);
  return cy.exec(command, { failOnNonZeroExit: false }).then((result: Cypress.Exec) => {
    if (result.stdout) {
      cy.log(`Command output: ${result.stdout}`);
    }
    return cy.wrap(result.code === 0);
  });
};
