import { checkInferenceServiceState } from './modelServing';
import { createCleanHardwareProfile } from './hardwareProfiles';
import { applyOpenShiftYaml, patchOpenShiftResource, pollUntilSuccess } from './baseCommands';
import { setupMcpServerDeployResources, cleanupMcpServerDeployResources } from './mcpServerDeploy';
import { replacePlaceholdersInYaml } from '../yaml_files';
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

  // Allow the backend ResourceWatcher cycle to propagate the change to the UI.
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.wait(30000);
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
 * Create an external model endpoint via the gen-ai BFF API.
 * Bypasses the UI form — creates the ConfigMap and Secret directly.
 *
 * @param namespace  - Project namespace to create the endpoint in.
 * @param modelId    - Model ID (e.g. 'gemini-2.5-flash').
 * @param displayName - Human-readable display name.
 * @param endpointUrl - Base URL of the external model provider.
 * @param apiKey      - API key / token for the provider.
 * @param modelType   - Model type: 'llm' | 'embedding' | 'transcription'. Defaults to 'llm'.
 */
export const createExternalModelViaAPI = (
  namespace: string,
  modelId: string,
  displayName: string,
  endpointUrl: string,
  apiKey: string,
  modelType = 'llm',
): Cypress.Chainable<Cypress.Response<unknown>> =>
  cy.request({
    method: 'POST',
    url: `/gen-ai/api/v1/models/external?namespace=${encodeURIComponent(namespace)}`,
    log: false,
    body: {
      /* eslint-disable camelcase */
      model_id: modelId,
      model_display_name: displayName,
      base_url: endpointUrl,
      secret_value: apiKey,
      model_type: modelType,
      /* eslint-enable camelcase */
    },
  });

/**
 * Ensure an MCP server entry exists in the gen-ai MCP servers ConfigMap.
 * Creates the ConfigMap if it doesn't exist, or patches an existing one.
 * Uses file-based patching to avoid shell injection from user-controlled values.
 */
export const ensureMCPServerConfigMapEntry = (
  configMapName: string,
  serverKey: string,
  serverData: { url: string; transport?: string; description?: string; logo?: string },
): void => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  const valueJson = JSON.stringify(serverData);
  const patchJson = JSON.stringify({ data: { [serverKey]: valueJson } });
  const patchFile = `/tmp/mcp-cm-patch-${Date.now()}.json`;

  cy.writeFile(patchFile, patchJson);

  cy.exec(`oc get configmap ${configMapName} -n ${namespace} -o name`, {
    failOnNonZeroExit: false,
  }).then((result) => {
    if (result.exitCode === 0) {
      cy.exec(
        `oc patch configmap ${configMapName} -n ${namespace} --type=merge --patch-file ${patchFile}`,
      );
    } else {
      const cmJson = JSON.stringify({
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name: configMapName, namespace },
        data: { [serverKey]: valueJson },
      });
      const cmFile = `/tmp/mcp-cm-create-${Date.now()}.json`;
      cy.writeFile(cmFile, cmJson);
      cy.exec(`oc apply -f ${cmFile}`);
    }
  });
};

/**
 * Remove an MCP server entry from the gen-ai MCP servers ConfigMap.
 * Uses file-based JSON patch to avoid shell injection from key values.
 */
export const removeMCPServerConfigMapEntry = (configMapName: string, serverKey: string): void => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  const escapedKey = serverKey.replace(/~/g, '~0').replace(/\//g, '~1');
  const patchJson = JSON.stringify([{ op: 'remove', path: `/data/${escapedKey}` }]);
  const patchFile = `/tmp/mcp-cm-remove-${Date.now()}.json`;

  cy.writeFile(patchFile, patchJson);
  cy.exec(
    `oc patch configmap ${configMapName} -n ${namespace} --type=json --patch-file ${patchFile}`,
    { failOnNonZeroExit: false },
  );
};

/**
 * Deploy a kubernetes-mcp-server for Gen AI playground testing.
 * Reuses mcpServerDeploy utilities for prerequisites (SA, CRB, ConfigMap)
 * and adds the Deployment, Service, and Route on top.
 * Idempotent — skips resources that already exist.
 *
 * Returns the in-cluster Service URL with `/mcp` suffix. The Route is still
 * created (for manual debugging) but the Service URL is used for the test
 * to avoid TLS failures on clusters where the ingress CA is not in the
 * BFF's trusted CA bundle.
 */
export const deployMCPServer = (
  mcpNamespace: string,
  image: string,
  clusterRoleBindingName: string,
): Cypress.Chainable<string> => {
  const name = 'kubernetes-mcp-server';

  cy.exec(`oc get project ${mcpNamespace} -o name`, { failOnNonZeroExit: false }).then((r) => {
    if (r.exitCode !== 0) {
      cy.exec(`oc new-project ${mcpNamespace}`);
    }
  });

  setupMcpServerDeployResources(mcpNamespace, {
    serviceAccountName: name,
    clusterRoleBindingName,
    configMapName: name,
  });

  cy.fixture('resources/genAi/mcp_server_deploy.yaml').then((yamlContent: string) => {
    const rendered = replacePlaceholdersInYaml(yamlContent, {
      NAMESPACE: mcpNamespace,
      IMAGE: image,
    });
    applyOpenShiftYaml(rendered);
  });

  cy.exec(`oc rollout status deployment/${name} -n ${mcpNamespace} --timeout=120s`, {
    timeout: 130000,
  });

  const url = `http://${name}.${mcpNamespace}.svc.cluster.local:8080/mcp`;
  cy.log(`MCP server URL: ${url}`);
  return cy.wrap(url);
};

/**
 * Tear down the MCP server deployed by deployMCPServer.
 * Removes workloads by label and cluster-scoped CRB via the shared utility.
 */
export const teardownMCPServer = (mcpNamespace: string, clusterRoleBindingName: string): void => {
  const name = 'kubernetes-mcp-server';
  cy.exec(
    `oc delete deployment,svc,route -l app.kubernetes.io/name=${name} -n ${mcpNamespace} --ignore-not-found`,
    { failOnNonZeroExit: false },
  );
  cleanupMcpServerDeployResources(clusterRoleBindingName);
};

export { cleanupServingRuntimeTemplate } from './servingRuntimeTemplate';
