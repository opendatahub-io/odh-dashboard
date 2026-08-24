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
    `oc get OdhDashboardConfig odh-dashboard-config -n ${namespace} -o json | jq -e '.spec.genAiStudioConfig.aiAssetCustomEndpoints.externalProviders == true'`,
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
  })
    .its('status')
    .should('eq', 200);
};

/**
 * Disable externalProviders in OdhDashboardConfig (revert to default).
 * Polls until the change is confirmed so later specs don't race on the stale flag.
 */
export const disableExternalProviders = (): void => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  const patchContent = JSON.stringify({
    spec: { genAiStudioConfig: { aiAssetCustomEndpoints: { externalProviders: false } } },
  });
  patchOpenShiftResource('OdhDashboardConfig', 'odh-dashboard-config', patchContent, namespace);

  pollUntilSuccess(
    `oc get OdhDashboardConfig odh-dashboard-config -n ${namespace} -o json | jq -e '.spec.genAiStudioConfig.aiAssetCustomEndpoints.externalProviders == false'`,
    'externalProviders to be false',
    { maxAttempts: 15, pollIntervalMs: 2000 },
  );
};

/**
 * Verify that no ConfigMap or Secret referencing the given model ID
 * remains in the namespace after endpoint deletion.
 * Uses polling to account for asynchronous controller cleanup, and
 * grep -F for literal string matching (avoids regex metacharacters in model IDs).
 */
export const verifyEndpointResourcesCleanedUp = (
  modelId: string,
  namespace: string,
  maxAttempts = 10,
  pollIntervalMs = 3000,
): void => {
  const checkCleanup = (attempt: number): void => {
    cy.exec(
      `oc get configmap -n ${namespace} -o jsonpath='{.items[*].metadata.name}' | grep -cF "${modelId}"`,
      { failOnNonZeroExit: false },
    ).then((cmResult) => {
      cy.exec(
        `oc get secret -n ${namespace} -o jsonpath='{.items[*].metadata.name}' | grep -cF "${modelId}"`,
        { failOnNonZeroExit: false },
      ).then((secretResult) => {
        const cmCount = parseInt(cmResult.stdout.trim(), 10) || 0;
        const secretCount = parseInt(secretResult.stdout.trim(), 10) || 0;

        if (cmCount === 0 && secretCount === 0) {
          cy.log(`Resources for "${modelId}" cleaned up (attempt ${attempt}/${maxAttempts})`);
          return;
        }
        if (attempt >= maxAttempts) {
          throw new Error(
            `Resources for "${modelId}" still exist after ${maxAttempts} attempts: ` +
              `${cmCount} ConfigMap(s), ${secretCount} Secret(s)`,
          );
        }
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(pollIntervalMs).then(() => checkCleanup(attempt + 1));
      });
    });
  };

  checkCleanup(1);
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
    cy.exec(
      `oc exec deploy/lsd-genai-playground -n ${namespace} -- curl -s ${serviceUrl} | jq -e '.data[] | select(.custom_metadata.provider_resource_id == "${modelId}")'`,
      { failOnNonZeroExit: false, timeout: 30000 },
    ).then((result) => {
      if (result.exitCode === 0 && result.stdout.trim().length > 0) {
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

/**
 * Create a prompt via the Gen AI BFF MLflow prompts API.
 *
 * @param namespace - The workspace/namespace for the prompt.
 * @param name - Prompt name (alphanumerics, hyphens, underscores, dots).
 * @param template - Prompt template string.
 * @param commitMessage - Commit message for the prompt version.
 */
export const createGenAiPromptViaAPI = (
  namespace: string,
  name: string,
  template: string,
  commitMessage: string,
): Cypress.Chainable<Cypress.Response<unknown>> =>
  cy
    .request({
      method: 'DELETE',
      url: `/gen-ai/api/v1/mlflow/prompts/${encodeURIComponent(
        name,
      )}?namespace=${encodeURIComponent(namespace)}`,
      failOnStatusCode: false,
    })
    .then(() =>
      cy.request({
        method: 'POST',
        url: `/gen-ai/api/v1/mlflow/prompts?namespace=${encodeURIComponent(namespace)}`,
        body: {
          name,
          template,
          commit_message: commitMessage, // eslint-disable-line camelcase
          create_only: true, // eslint-disable-line camelcase
        },
      }),
    );

/**
 * Delete a prompt via the Gen AI BFF MLflow prompts API.
 * Silently succeeds if the prompt does not exist.
 *
 * @param namespace - The workspace/namespace for the prompt.
 * @param name - Prompt name to delete.
 */
export const deleteGenAiPromptViaAPI = (namespace: string, name: string): void => {
  cy.request({
    method: 'DELETE',
    url: `/gen-ai/api/v1/mlflow/prompts/${encodeURIComponent(name)}?namespace=${encodeURIComponent(
      namespace,
    )}`,
    failOnStatusCode: false,
  });
};

/**
 * Discover all namespaces that contain an OdhDashboardConfig named
 * `odh-dashboard-config`. Falls back to APPLICATIONS_NAMESPACE when
 * the cluster-wide query returns nothing.
 */
const getOdhDashboardConfigNamespaces = (): Cypress.Chainable<string[]> =>
  cy
    .exec(`oc get OdhDashboardConfig -A -o jsonpath='{.items[*].metadata.namespace}'`, {
      failOnNonZeroExit: false,
    })
    .then((result) => {
      const namespaces = result.stdout.replace(/'/g, '').trim().split(/\s+/).filter(Boolean);
      if (namespaces.length > 0) {
        return namespaces;
      }
      return [Cypress.env('APPLICATIONS_NAMESPACE') as string];
    });

/**
 * Set globalMLflowNamespaces in OdhDashboardConfig so the MLflow BFF
 * treats prompts from those namespaces as global / read-only.
 *
 * Patches every OdhDashboardConfig instance on the cluster so the
 * setting takes effect regardless of which namespace the MLflow BFF
 * reads its config from.
 *
 * @param namespaces - Array of namespace names to mark as global.
 */
export const setGlobalMLflowNamespaces = (namespaces: string[]): void => {
  const patchContent = JSON.stringify({
    spec: { globalMLflowNamespaces: namespaces },
  });
  const expected = JSON.stringify(namespaces);

  getOdhDashboardConfigNamespaces().then((configNamespaces) => {
    for (const ns of configNamespaces) {
      patchOpenShiftResource('OdhDashboardConfig', 'odh-dashboard-config', patchContent, ns);
    }

    cy.step('Wait for globalMLflowNamespaces to be confirmed in all config instances');
    for (const ns of configNamespaces) {
      pollUntilSuccess(
        `oc get OdhDashboardConfig odh-dashboard-config -n ${ns} -o json | jq -e '.spec.globalMLflowNamespaces == ${expected}'`,
        `globalMLflowNamespaces to be set in ${ns}`,
        { maxAttempts: 30, pollIntervalMs: 2000 },
      );
    }
  });
};

/**
 * Clear globalMLflowNamespaces from OdhDashboardConfig (revert to default).
 * Clears every instance on the cluster, mirroring setGlobalMLflowNamespaces.
 */
export const clearGlobalMLflowNamespaces = (): void => {
  const patchContent = JSON.stringify({
    spec: { globalMLflowNamespaces: [] },
  });

  getOdhDashboardConfigNamespaces().then((configNamespaces) => {
    for (const ns of configNamespaces) {
      patchOpenShiftResource('OdhDashboardConfig', 'odh-dashboard-config', patchContent, ns);
    }

    for (const ns of configNamespaces) {
      pollUntilSuccess(
        `oc get OdhDashboardConfig odh-dashboard-config -n ${ns} -o json | jq -e '(.spec.globalMLflowNamespaces // []) == []'`,
        `globalMLflowNamespaces to be cleared in ${ns}`,
        { maxAttempts: 15, pollIntervalMs: 2000 },
      );
    }
  });
};

/**
 * Poll the Gen AI BFF prompt listing endpoint until global prompts appear.
 * The MLflow BFF polls OdhDashboardConfig every 30s for global namespaces,
 * so after patching the config there is a window where the BFF cache is stale
 * and global prompts are not included in listings.
 */
export const waitForGlobalPromptsInBFF = (
  projectNamespace: string,
  expectedPromptName: string,
  maxAttempts = 15,
  pollIntervalMs = 3000,
): void => {
  const startTime = Date.now();

  const check = (attemptNumber: number): void => {
    cy.request({
      url: `/gen-ai/api/v1/mlflow/prompts?namespace=${encodeURIComponent(projectNamespace)}`,
      failOnStatusCode: false,
    }).then((response) => {
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
      const bffUnavailable = response.headers['x-mlflow-bff-unavailable'];
      const bffError = response.headers['x-mlflow-bff-error'];
      const body = response.body || {};
      const prompts: { name?: string; scope?: { type?: string } }[] =
        body.data?.prompts || body.prompts || [];
      const found = prompts.some(
        (p) => p.name === expectedPromptName && p.scope?.type === 'global',
      );

      if (found) {
        cy.log(`Global prompt "${expectedPromptName}" discovered by BFF (after ${elapsedTime}s)`);
        return;
      }

      const debugInfo = [
        `status=${response.status}`,
        `prompts=${prompts.length}`,
        bffUnavailable ? 'MLflow-BFF-Unavailable' : '',
        bffError ? 'MLflow-BFF-Error' : '',
        prompts.length > 0
          ? `names=[${prompts.map((p) => `${p.name ?? '?'}(${p.scope?.type ?? '?'})`).join(',')}]`
          : '',
      ]
        .filter(Boolean)
        .join(', ');

      if (attemptNumber >= maxAttempts) {
        throw new Error(
          `MLflow BFF did not return global prompt "${expectedPromptName}" after ${maxAttempts} attempts (${elapsedTime}s). ` +
            `Last response: ${debugInfo}. ` +
            `Body keys: ${JSON.stringify(Object.keys(body))}. ` +
            `The MLflow BFF polls OdhDashboardConfig every 30s for global namespaces.`,
        );
      }

      cy.log(
        `Waiting for BFF to discover global prompt (attempt ${attemptNumber}/${maxAttempts}, elapsed: ${elapsedTime}s, ${debugInfo})`,
      );
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
    });
  };

  cy.step('Wait for MLflow BFF to discover global namespace and prompt');
  check(1);
};

export { cleanupServingRuntimeTemplate } from './servingRuntimeTemplate';
