import { checkInferenceServiceState } from './modelServing';
import { createCleanHardwareProfile } from './hardwareProfiles';
import type { CommandLineResult, GenAiTestData } from '../../types';

/**
 * Get the applications namespace from Cypress environment.
 * @throws Error if APPLICATIONS_NAMESPACE is not configured.
 */
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
 * Deploy a Gen AI model via oc commands, bypassing the UI wizard.
 * Applies the ServingRuntime and InferenceService YAMLs directly,
 * with the `opendatahub.io/genai-asset` label so the model appears
 * on the AI asset endpoints page.
 *
 * @param projectName - Namespace to deploy into.
 * @param testData - Fixture data with model URI, names, and hardware profile paths.
 */
export const deployGenAiModel = (projectName: string, testData: GenAiTestData): void => {
  const {
    inferenceServiceName,
    connectionURI,
    hardwareProfileResourceYamlPath,
    hardwareProfileName,
  } = testData;

  cy.step('Create hardware profile for model deployment');
  createCleanHardwareProfile(hardwareProfileResourceYamlPath);

  cy.step('Apply ServingRuntime to project namespace');
  cy.fixture('resources/modelServing/singleModel/vllm_cpu_amd64_runtime.yaml', 'utf8').then(
    (srYaml: string) => {
      const tmpFile = `/tmp/genai-sr-${Date.now()}.yaml`;
      cy.writeFile(tmpFile, srYaml);
      cy.exec(`oc apply -n ${projectName} -f ${tmpFile}`).then((result) => {
        if (result.exitCode !== 0) {
          throw new Error(`ServingRuntime apply failed: ${result.stderr}`);
        }
      });
    },
  );

  cy.step('Apply InferenceService with genai-asset label');
  cy.fixture('resources/genAi/gen-ai-inference-service.yaml', 'utf8').then(
    (isvcTemplate: string) => {
      const isvcYaml = isvcTemplate
        .replace('__ISVC_NAME__', inferenceServiceName)
        .replace('__HW_PROFILE__', hardwareProfileName)
        .replace('__MODEL_URI__', connectionURI);
      const isvcTmpFile = `/tmp/genai-isvc-${Date.now()}.yaml`;
      cy.writeFile(isvcTmpFile, isvcYaml);
      cy.exec(`oc apply -n ${projectName} -f ${isvcTmpFile}`).then((result) => {
        if (result.exitCode !== 0) {
          throw new Error(`InferenceService apply failed: ${result.stderr}`);
        }
      });
    },
  );

  cy.step('Wait for InferenceService to be Ready');
  checkInferenceServiceState(inferenceServiceName, projectName, { checkReady: true });
};

/**
 * Cleanup serving runtime template by ServingRuntime name.
 * Searches for templates containing a ServingRuntime with the given name.
 *
 * @param servingRuntimeName - The ServingRuntime metadata.name to search for inside templates.
 * @returns A Cypress chainable that resolves when cleanup is complete.
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
