import { pollUntilSuccess } from './baseCommands';

/**
 * Verifies that an InferenceService has a specific annotation with the expected value
 * @param namespace - Project/namespace name
 * @param inferenceServiceName - Name of the InferenceService
 * @param annotationKey - Annotation key to check
 * @param expectedValue - Expected annotation value
 * @returns Cypress chainable boolean (true if annotation matches, false otherwise)
 */
export const verifyInferenceServiceAnnotation = (
  namespace: string,
  inferenceServiceName: string,
  annotationKey: string,
  expectedValue: string,
): Cypress.Chainable<boolean> => {
  const command = `oc get inferenceservice ${inferenceServiceName} -n ${namespace} -o jsonpath='{.metadata.annotations.${annotationKey}}'`;

  // Poll until the InferenceService has the annotation (it may not exist immediately after submit)
  return pollUntilSuccess(
    command,
    `InferenceService ${inferenceServiceName} annotation ${annotationKey}`,
    { maxAttempts: 30, pollIntervalMs: 2000 },
  ).then((result) => {
    cy.log(`Checking InferenceService annotation: ${annotationKey} in namespace '${namespace}'`);
    if (result.exitCode === 0) {
      const actualValue = result.stdout.trim();
      cy.log(`Annotation value: ${actualValue}`);
      return actualValue === expectedValue;
    }
    cy.log(`Failed to get InferenceService annotation: ${result.stderr}`);
    return false;
  });
};
