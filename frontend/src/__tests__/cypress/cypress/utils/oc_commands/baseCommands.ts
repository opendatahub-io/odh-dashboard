import type { CommandLineResult } from '~/__tests__/cypress/cypress/types';

/**
 * Applies the given YAML content using the `oc apply` command.
 *
 * @param yamlContent YAML content to be applied
 * @returns Cypress Chainable
 */
export const applyOpenShiftYaml = (yamlContent: string): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc apply -f - <<EOF\n${yamlContent}EOF`;
  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      // If there is an error, log the error and fail the test
      cy.log(`ERROR applying YAML content
              stdout: ${result.stdout}
              stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};
