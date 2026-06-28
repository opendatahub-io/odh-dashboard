import { checkInferenceServiceState } from './modelServing';
import { createCleanHardwareProfile } from './hardwareProfiles';
import { patchOpenShiftResource, pollUntilSuccess } from './baseCommands';
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

  cy.step('Wait for externalProviders to be confirmed in config');
  pollUntilSuccess(
    `oc get OdhDashboardConfig -A -o json | jq -e '.items[].spec.genAiStudioConfig.aiAssetCustomEndpoints.externalProviders == true'`,
    'externalProviders to be true',
    { maxAttempts: 30, pollIntervalMs: 2000 },
  );
};

/**
 * Force the dashboard backend to refresh its cached OdhDashboardConfig from the cluster.
 * The backend caches config with a 2-minute refresh interval (ResourceWatcher).
 * Sending Cache-Control: no-cache triggers an immediate re-fetch from the cluster.
 * Must be called after authentication (cy.visitWithLogin) so cookies are available.
 */
export const forceDashboardConfigRefresh = (): void => {
  cy.request({
    url: '/api/config',
    headers: { 'Cache-Control': 'no-cache' },
    failOnStatusCode: false,
  });
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
    `oc get configmap -n ${namespace} -o jsonpath='{.items[*].metadata.name}' | grep -c "${modelId}"`,
    { failOnNonZeroExit: false },
  ).then((result) => {
    expect(result.stdout.trim()).to.equal('0');
  });
  cy.exec(
    `oc get secret -n ${namespace} -o jsonpath='{.items[*].metadata.name}' | grep -c "${modelId}"`,
    { failOnNonZeroExit: false },
  ).then((result) => {
    expect(result.stdout.trim()).to.equal('0');
  });
};

/**
 * Poll the LSD service's /v1/models endpoint until the specified model
 * appears in the response. This ensures the model is fully registered
 * and available for inference, not just that the pod is running.
 */
export const waitForModelInLSD = (
  serviceName: string,
  modelId: string,
  namespace: string,
  maxAttempts = 20,
  pollIntervalMs = 5000,
): void => {
  const serviceUrl = `http://${serviceName}.${namespace}.svc.cluster.local:8321/v1/models`;

  const check = (attempt: number): void => {
    cy.exec(`oc exec deploy/lsd-genai-playground -n ${namespace} -- curl -s ${serviceUrl}`, {
      failOnNonZeroExit: false,
      timeout: 30000,
    }).then((result) => {
      if (result.exitCode === 0 && result.stdout.includes(modelId)) {
        cy.log(`Model "${modelId}" registered in LSD (attempt ${attempt}/${maxAttempts})`);
        return;
      }
      if (attempt >= maxAttempts) {
        throw new Error(
          `Model "${modelId}" not found in LSD after ${(maxAttempts * pollIntervalMs) / 1000}s`,
        );
      }
      cy.log(`Model "${modelId}" not yet available (attempt ${attempt}/${maxAttempts})`);
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(pollIntervalMs).then(() => check(attempt + 1));
    });
  };

  check(1);
};

export { cleanupServingRuntimeTemplate } from './servingRuntimeTemplate';
