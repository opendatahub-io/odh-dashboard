import type { CommandLineResult } from '~/__tests__/cypress/cypress/types';

/**
 * Validates environment variables in a workbench pod
 *
 * @param namespace The namespace where the workbench pod is running
 * @param workbench The name of the workbench container
 * @param variablesToCheck Array of environment variable names and expected values to validate
 * @returns Cypress.Chainable that resolves to the result of the validation
 */
export const validateWorkbenchEnvironmentVariables = (
  namespace: string,
  workbench: string,
  variablesToCheck: Record<string, string>,
): Cypress.Chainable<CommandLineResult> => {
  const getPodNameCommand = `oc get pods -n ${namespace} -o custom-columns=NAME:.metadata.name --no-headers | grep ^${workbench}`;
  cy.log(`Executing command: ${getPodNameCommand}`);

  return cy.exec(getPodNameCommand, { failOnNonZeroExit: false }).then((result) => {
    const workbenchPodName = result.stdout.trim();

    if (workbenchPodName) {
      cy.log(
        `Workbench pod found: ${workbenchPodName}. Proceeding to validate environment variables.`,
      );

      // Construct grep command for all variables
      const grepPattern = Object.keys(variablesToCheck).join('|');
      const validateEnvVarsCommand = `oc exec -n ${namespace} ${workbenchPodName} -c ${workbench} -- env | grep -E "^(${grepPattern})="`;
      cy.log(`Executing command: ${validateEnvVarsCommand}`);

      return cy.exec(validateEnvVarsCommand, { failOnNonZeroExit: false }).then((envResult) => {
        if (envResult.code !== 0) {
          throw new Error(`Failed to validate environment variables: ${envResult.stderr}`);
        }

        // Validate each variable's value
        Object.entries(variablesToCheck).forEach(([key, expectedValue]) => {
          const regex = new RegExp(`^${key}=${expectedValue}$`, 'm');
          if (!regex.test(envResult.stdout)) {
            throw new Error(
              `Validation failed for variable: ${key}. Expected value: ${expectedValue}`,
            );
          }
          cy.log(`✅ Variable "${key}" validated with value "${expectedValue}".`);
        });

        return cy.wrap(envResult);
      });
    }

    cy.log('No matching workbench pod found, skipping environment variable validation.');
    return cy.wrap(result);
  });
};
