/**
 * Verifies that an InferenceService has a specific annotation with the expected value.
 * Polls until both the command succeeds AND the annotation matches the expected value.
 */
export const verifyInferenceServiceAnnotation = (
  namespace: string,
  inferenceServiceName: string,
  annotationKey: string,
  expectedValue: string,
  { maxAttempts = 30, pollIntervalMs = 2000 } = {},
): Cypress.Chainable<boolean> => {
  const command = `oc get inferenceservice ${inferenceServiceName} -n ${namespace} -o go-template='{{index .metadata.annotations "${annotationKey}"}}'`;

  const check = (attempt = 1): Cypress.Chainable<boolean> =>
    cy.exec(command, { failOnNonZeroExit: false }).then((result) => {
      const actualValue = result.stdout.trim();

      if (result.exitCode === 0 && actualValue === expectedValue) {
        cy.log(
          `Checking InferenceService annotation: ${annotationKey} in namespace '${namespace}'`,
        );
        cy.log(`Annotation value: ${actualValue}`);
        return cy.wrap(true);
      }

      if (attempt % 5 === 1) {
        cy.log(
          `[attempt ${attempt}] exit=${result.exitCode} stdout="${actualValue}" stderr="${result.stderr}"`,
        );
      }

      if (attempt >= maxAttempts) {
        cy.log(
          `Annotation ${annotationKey} not matched after ${maxAttempts} attempts (got: "${actualValue}", expected: "${expectedValue}")`,
        );
        return cy.wrap(false);
      }

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(pollIntervalMs).then(() => check(attempt + 1));
    });

  cy.log(
    `Polling for annotation ${annotationKey}=${expectedValue} (max ${
      (maxAttempts * pollIntervalMs) / 1000
    }s)`,
  );
  return check();
};
