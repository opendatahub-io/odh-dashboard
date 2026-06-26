import { checkInferenceServiceState } from './modelServing';
import { createCleanHardwareProfile } from './hardwareProfiles';
import { patchOpenShiftResource } from './baseCommands';
import type { GenAiTestData } from '../../types';

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
 * Enable externalProviders in OdhDashboardConfig so that non-cluster-local
 * endpoint URLs are accepted by the custom endpoints form.
 */
export const enableExternalProviders = (): void => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  const patchContent = JSON.stringify({
    spec: { genAiStudioConfig: { aiAssetCustomEndpoints: { externalProviders: true } } },
  });
  patchOpenShiftResource('OdhDashboardConfig', 'odh-dashboard-config', patchContent, namespace);
};

/**
 * Disable externalProviders in OdhDashboardConfig (revert to default).
 */
export const disableExternalProviders = (): void => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  const patchContent = JSON.stringify({
    spec: { genAiStudioConfig: { aiAssetCustomEndpoints: { externalProviders: false } } },
  });
  patchOpenShiftResource('OdhDashboardConfig', 'odh-dashboard-config', patchContent, namespace);
};

/**
 * Verify that no ConfigMap or Secret referencing the given model ID
 * remains in the namespace after endpoint deletion.
 */
export const verifyEndpointResourcesCleanedUp = (modelId: string, namespace: string): void => {
  cy.exec(
    `oc get configmap -n ${namespace} -o jsonpath='{.items[*].metadata.name}' | grep -c "${modelId}" || echo "0"`,
    { failOnNonZeroExit: false },
  ).then((result) => {
    expect(result.stdout.trim()).to.equal('0');
  });
  cy.exec(
    `oc get secret -n ${namespace} -o jsonpath='{.items[*].metadata.name}' | grep -c "${modelId}" || echo "0"`,
    { failOnNonZeroExit: false },
  ).then((result) => {
    expect(result.stdout.trim()).to.equal('0');
  });
};

export { cleanupServingRuntimeTemplate } from './servingRuntimeTemplate';
