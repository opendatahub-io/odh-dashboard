/**
 * Check InferenceService active model state
 *
 *
 * @param serviceName InferenceService name
 * @returns Result Object of the operation
 */
/* eslint-disable cypress/no-unnecessary-waiting */
export const checkInferenceServiceState = (
  serviceName: string,
): Cypress.Chainable<Cypress.Exec> => {
  const ocCommand = `oc get inferenceService ${serviceName} -o json | grep activeModelState`;
  const maxAttempts = 60; // 5 minutes / 5 seconds = 60 attempts
  let attempts = 0;

  const checkState = (): Cypress.Chainable<Cypress.Exec> => {
    return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      attempts++;

      // Use cy.log for both Cypress logging and console output
      cy.log(`🧐 Attempt ${attempts}: Checking InferenceService state
          Command: ${ocCommand}
          Output: ${result.stdout}`);

      if (result.stdout.includes('"activeModelState": "Loaded"')) {
        cy.log(
          `✅ InferenceService ${serviceName} is in "Loaded" state after ${attempts} attempts`,
        );
        return cy.wrap(result);
      }
      if (attempts >= maxAttempts) {
        const errorMessage = `❌ InferenceService ${serviceName} did not reach "Loaded" state within 5 minutes`;
        cy.log(errorMessage);
        throw new Error(errorMessage);
      } else {
        return cy.wait(5000).then(() => checkState());
      }
    });
  };

  return checkState();
};
