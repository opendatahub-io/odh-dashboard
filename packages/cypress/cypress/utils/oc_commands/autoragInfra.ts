/* eslint-disable cypress/no-unnecessary-waiting */
import * as yaml from 'js-yaml';

import { pollUntilSuccess } from './baseCommands';
import { allowOgxAccess } from './ogxNetworkPolicy';
import { createOgxSecret } from './ogxSecret';
import { checkInferenceServiceState } from './modelServing';
import type { CommandLineResult } from '../../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LLM_SERVING_RUNTIME = 'autorag-vllm-cpu-runtime';
const LLM_INFERENCE_SERVICE = 'autorag-llm';
const MILVUS_DEPLOYMENT = 'milvus';
const MILVUS_PORT = 19530;
const OGX_SERVER_NAME = 'autorag-ogx';
const OGX_CONFIG_MAP = 'ogx-config';
const OGX_PORT = 8321;

// Embedding is handled by OGX's built-in inline::sentence-transformers provider.
// No external InferenceService needed — it runs inside the OGX pod on CPU.
// Uses all-MiniLM-L6-v2: public (no HuggingFace auth), small (22M params), 384-dim.
const INLINE_EMBEDDING_MODEL_ID = 'sentence-transformers/all-MiniLM-L6-v2';
const INLINE_EMBEDDING_DIMENSION = 384;

// Default images — overridable via CYPRESS_ env vars for disconnected clusters
const DEFAULT_VLLM_CPU_IMAGE = 'quay.io/rh-aiservices-bu/vllm-cpu-openai-ubi9:0.3';
const DEFAULT_LLM_MODEL_URI =
  'oci://quay.io/redhat-ai-services/modelcar-catalog:llama-3.2-1b-instruct';
const DEFAULT_MILVUS_IMAGE = 'milvusdb/milvus:v2.5.4';

// Placeholder tokens used in YAML fixtures — replaced at runtime
const VLLM_IMAGE_PLACEHOLDER = '{{VLLM_CPU_IMAGE}}';
const MILVUS_IMAGE_PLACEHOLDER = '{{MILVUS_IMAGE}}';
const LLM_MODEL_URI_PLACEHOLDER = '{{LLM_MODEL_URI}}';

// ---------------------------------------------------------------------------
// Image resolution helpers (disconnected cluster support)
// ---------------------------------------------------------------------------

/**
 * Resolve an image reference, checking for a CYPRESS_ env var override first.
 * On connected clusters (ODH CI), returns the default.
 * On disconnected clusters (Jenkins), set CYPRESS_AUTORAG_* env vars in the pipeline.
 */
const getImage = (envKey: string, defaultImage: string): string =>
  (Cypress.env(envKey) as string) || defaultImage;

const getVllmCpuImage = (): string => getImage('AUTORAG_VLLM_CPU_IMAGE', DEFAULT_VLLM_CPU_IMAGE);
const getLlmModelUri = (): string => getImage('AUTORAG_LLM_MODEL_URI', DEFAULT_LLM_MODEL_URI);
const getMilvusImage = (): string => getImage('AUTORAG_MILVUS_IMAGE', DEFAULT_MILVUS_IMAGE);

// ---------------------------------------------------------------------------
// Self-contained OGX/LlamaStack compatibility helpers
//
// The upstream CRD is being renamed from LlamaStack → OGX. Different clusters
// may have either (or both) CRDs active. These helpers detect which one to use
// at runtime: try OGX first, fall back to LlamaStack.
// ---------------------------------------------------------------------------

/**
 * Detect which DSC component name is active: 'ogx' (new) or 'llamastackoperator' (old).
 */
const detectDscComponentName = (): Cypress.Chainable<string> =>
  cy
    .exec(`oc get datasciencecluster default-dsc -o jsonpath='{.spec.components.ogx}'`, {
      failOnNonZeroExit: false,
    })
    .then((result) => {
      const raw = result.stdout.trim().replace(/'/g, '');
      return cy.wrap(raw && raw !== '{}' ? 'ogx' : 'llamastackoperator');
    });

/**
 * Detect which distribution CRD to use based on the active DSC component.
 * OGXServer and LlamaStackDistribution have different spec schemas, so CRD
 * existence alone is not enough — we must match the operator that is managing them.
 */
const detectDistributionCrd = (): Cypress.Chainable<{
  kind: string;
  apiVersion: string;
  plural: string;
}> =>
  detectDscComponentName().then((componentName) => {
    if (componentName === 'ogx') {
      return cy.wrap({
        kind: 'OGXServer',
        apiVersion: 'ogx.io/v1beta1',
        plural: 'ogxservers',
      });
    }
    return cy.wrap({
      kind: 'LlamaStackDistribution',
      apiVersion: 'llamastack.io/v1alpha1',
      plural: 'llamastackdistributions',
    });
  });

/**
 * Self-contained wait for an OGX distribution server to be Ready.
 * Detects the correct CRD type (ogxservers or llamastackdistributions) automatically.
 */
const waitForDistributionReady = (
  namespace: string,
  maxAttempts = 60,
  pollIntervalMs = 5000,
): void => {
  detectDistributionCrd().then((crd) => {
    const startTime = Date.now();

    const check = (attemptNumber = 1): void => {
      cy.exec(`oc get ${crd.plural} -n ${namespace} -o json`, {
        failOnNonZeroExit: false,
      }).then((result) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (result.exitCode !== 0 || !result.stdout.trim()) {
          if (attemptNumber >= maxAttempts) {
            throw new Error(
              `No ${crd.kind} found in namespace ${namespace} after ${attemptNumber} attempts`,
            );
          }
          cy.log(`No ${crd.kind} found yet (attempt ${attemptNumber}/${maxAttempts})`);
          cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
          return;
        }

        let items: Array<{
          status?: {
            phase?: string;
            conditions?: Array<{ type: string; status: string; message?: string; reason?: string }>;
          };
          metadata?: { name?: string };
        }>;
        try {
          items = (JSON.parse(result.stdout) as { items: typeof items }).items;
        } catch {
          throw new Error(`Failed to parse ${crd.kind} JSON`);
        }

        if (items.length === 0) {
          if (attemptNumber >= maxAttempts) {
            throw new Error(
              `No ${crd.kind} found in namespace ${namespace} after ${attemptNumber} attempts`,
            );
          }
          cy.log(`No ${crd.kind} found yet (attempt ${attemptNumber}/${maxAttempts})`);
          cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
          return;
        }

        const server = items[0];
        const phase = server.status?.phase ?? 'Unknown';
        const name = server.metadata?.name ?? 'unknown';

        if (phase === 'Ready') {
          cy.log(`${crd.kind} ${name} is Ready in ${namespace} (after ${elapsed}s)`);
          return;
        }

        if (phase === 'Failed') {
          const details = (server.status?.conditions ?? [])
            .map((c) => `${c.type}: ${c.status}${c.message ? ` - ${c.message}` : ''}`)
            .join('\n');
          throw new Error(
            `${crd.kind} ${name} failed in ${namespace}\nPhase: Failed\n${details || 'No details'}`,
          );
        }

        if (attemptNumber >= maxAttempts) {
          throw new Error(
            `${crd.kind} ${name} not Ready within ${
              (maxAttempts * pollIntervalMs) / 1000
            }s. Phase: ${phase}`,
          );
        }

        cy.log(
          `${crd.kind} ${name} phase: "${phase}" (attempt ${attemptNumber}/${maxAttempts}, elapsed: ${elapsed}s)`,
        );
        cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
      });
    };

    cy.step(`Polling for ${crd.kind} Ready in ${namespace}`);
    check();
  });
};

// ---------------------------------------------------------------------------
// OGX operator state (read-only — never patches the DSC)
// ---------------------------------------------------------------------------

/**
 * Check if the OGX/LlamaStack operator is currently Managed on the cluster.
 * Returns true if the operator component is set to Managed in the DSC.
 */
export const isOgxOperatorManaged = (): Cypress.Chainable<boolean> =>
  detectDscComponentName().then((componentName) =>
    cy
      .exec(
        `oc get datasciencecluster default-dsc -o jsonpath='{.spec.components.${componentName}.managementState}'`,
        { failOnNonZeroExit: false },
      )
      .then((result) => cy.wrap(result.stdout.trim().replace(/'/g, '') === 'Managed')),
  );

// ---------------------------------------------------------------------------
// YAML generation helpers
// ---------------------------------------------------------------------------

/**
 * Replace placeholders in a YAML fixture with resolved image/URI values.
 * Fixtures use {{PLACEHOLDER}} tokens that get replaced at runtime.
 */
const resolveFixturePlaceholders = (yamlContent: string): string =>
  yamlContent
    .replace(new RegExp(VLLM_IMAGE_PLACEHOLDER.replace(/[{}]/g, '\\$&'), 'g'), getVllmCpuImage())
    .replace(new RegExp(LLM_MODEL_URI_PLACEHOLDER.replace(/[{}]/g, '\\$&'), 'g'), getLlmModelUri())
    .replace(new RegExp(MILVUS_IMAGE_PLACEHOLDER.replace(/[{}]/g, '\\$&'), 'g'), getMilvusImage());

/**
 * Apply a YAML fixture to a namespace, resolving placeholders with runtime values.
 */
const applyFixture = (
  namespace: string,
  fixturePath: string,
): Cypress.Chainable<CommandLineResult> =>
  cy.fixture(fixturePath).then((content: string) => {
    const resolved = resolveFixturePlaceholders(content);
    const tempFile = `/tmp/autorag_fixture_${Date.now()}.yaml`;
    cy.writeFile(tempFile, resolved);
    return cy.exec(`oc apply -f "${tempFile}" -n ${namespace}`).then((result) => {
      cy.exec(`rm -f ${tempFile}`);
      return cy.wrap(result);
    });
  });

// ---------------------------------------------------------------------------
// OGX config generation
// ---------------------------------------------------------------------------

/**
 * Build the OGX run.yaml configuration content.
 *
 * This mirrors the structure from the gen-ai BFF's NewDefaultLlamaStackConfig()
 * in packages/gen-ai/bff/internal/integrations/kubernetes/llamastack_config.go.
 *
 * The config registers:
 * - An LLM inference provider (remote::vllm) pointing at the LLM InferenceService
 * - A sentence-transformers provider for inline embedding (runs inside OGX pod, no GPU needed)
 * - A Milvus vector_io provider (remote::milvus) pointing at the Milvus service
 * - Registered models for LLM and embedding (inline)
 */
/* eslint-disable camelcase -- OGX config.yaml requires snake_case keys */
const buildOgxConfig = (namespace: string): string => {
  const llmUrl = `http://${LLM_INFERENCE_SERVICE}-predictor.${namespace}.svc.cluster.local/v1`;
  const milvusUri = `http://${MILVUS_DEPLOYMENT}.${namespace}.svc.cluster.local:${MILVUS_PORT}`;

  const config = {
    version: '2',
    distro_name: 'rh',
    apis: ['inference', 'vector_io', 'files', 'tool_runtime', 'responses'],
    providers: {
      files: [
        {
          provider_id: 'meta-reference-files',
          provider_type: 'inline::localfs',
          config: {
            storage_dir: '/opt/app-root/src/.llama/distributions/rh/files',
            metadata_store: { table_name: 'files_metadata', backend: 'sql_default' },
          },
        },
      ],
      tool_runtime: [
        { provider_id: 'file-search', provider_type: 'inline::file-search', config: {} },
      ],
      inference: [
        {
          provider_id: 'sentence-transformers',
          provider_type: 'inline::sentence-transformers',
          config: {},
        },
        {
          provider_id: 'vllm-inference-llm',
          provider_type: 'remote::vllm',
          config: {
            base_url: llmUrl,
            max_tokens: '${env.VLLM_MAX_TOKENS:=4096}',
            api_token: '${env.VLLM_API_TOKEN_1:=fake}',
            tls_verify: '${env.VLLM_TLS_VERIFY:=false}',
          },
        },
      ],
      vector_io: [
        {
          provider_id: 'milvus-remote',
          provider_type: 'remote::milvus',
          config: {
            uri: milvusUri,
            token: '',
            persistence: {
              namespace: 'vector_io::milvus-remote',
              backend: 'kv_default',
            },
          },
        },
      ],
      responses: [
        {
          provider_id: 'builtin',
          provider_type: 'inline::builtin',
          config: {
            persistence: {
              agent_state: { namespace: 'agents', backend: 'kv_default' },
              responses: {
                table_name: 'responses',
                backend: 'sql_default',
                max_write_queue_size: 10000,
                num_writers: 4,
              },
            },
          },
        },
      ],
    },
    metadata_store: {
      type: 'sqlite',
      db_path: '/opt/app-root/src/.llama/distributions/rh/inference_store.db',
    },
    storage: {
      backends: {
        kv_default: {
          type: 'kv_sqlite',
          db_path: '/opt/app-root/src/.llama/distributions/rh/kvstore.db',
        },
        sql_default: {
          type: 'sql_sqlite',
          db_path: '/opt/app-root/src/.llama/distributions/rh/sql_store.db',
        },
      },
      stores: {
        metadata: { namespace: 'registry', backend: 'kv_default' },
        inference: { table_name: 'inference_store', backend: 'sql_default' },
        conversations: { table_name: 'openai_conversations', backend: 'sql_default' },
      },
    },
    vector_stores: {
      default_provider_id: 'milvus-remote',
      default_embedding_model: {
        provider_id: 'sentence-transformers',
        model_id: 'all-MiniLM-L6-v2',
      },
    },
    registered_resources: {
      models: [
        {
          model_id: LLM_INFERENCE_SERVICE,
          provider_id: 'vllm-inference-llm',
          provider_model_id: LLM_INFERENCE_SERVICE,
          model_type: 'llm',
          metadata: { display_name: LLM_INFERENCE_SERVICE },
        },
        {
          model_id: INLINE_EMBEDDING_MODEL_ID,
          provider_id: 'sentence-transformers',
          provider_model_id: INLINE_EMBEDDING_MODEL_ID,
          model_type: 'embedding',
          metadata: {
            display_name: INLINE_EMBEDDING_MODEL_ID,
            embedding_dimension: INLINE_EMBEDDING_DIMENSION,
          },
        },
      ],
      shields: [],
      vector_stores: [],
      datasets: [],
      scoring_fns: [],
      benchmarks: [],
    },
    server: {
      port: OGX_PORT,
    },
  };

  return `# OGX Configuration (generated by AutoRAG E2E infrastructure)\n${yaml.dump(config, {
    lineWidth: -1,
  })}`;
};
/* eslint-enable camelcase */

// ---------------------------------------------------------------------------
// Deploy helpers
// ---------------------------------------------------------------------------

/**
 * Deploy Milvus standalone into the namespace.
 */
export const deployMilvus = (namespace: string): Cypress.Chainable<CommandLineResult> => {
  cy.log(`Deploying Milvus standalone in namespace ${namespace}`);
  return applyFixture(namespace, 'resources/autorag/milvus-standalone.yaml');
};

/**
 * Wait for the Milvus pod to be ready.
 */
export const waitForMilvusReady = (
  namespace: string,
  maxAttempts = 60,
  pollIntervalMs = 5000,
): Cypress.Chainable<Cypress.Exec> => {
  const command = `oc get pods -n ${namespace} -l app=milvus -o jsonpath='{.items[0].status.phase}'`;
  return pollUntilSuccess(
    `${command} | grep -q Running && ${command}`,
    `Milvus pod to be Running in ${namespace}`,
    { maxAttempts, pollIntervalMs },
  );
};

/**
 * Deploy the LLM serving runtime and InferenceService.
 */
export const deployLlmModel = (namespace: string): void => {
  cy.log('Deploying LLM serving runtime and InferenceService');
  applyFixture(namespace, 'resources/autorag/llm-serving-runtime.yaml');
  applyFixture(namespace, 'resources/autorag/llm-inference-service.yaml');
};

/**
 * Wait for the LLM InferenceService to be ready.
 * Embedding is handled inline by OGX (no external InferenceService).
 */
export const waitForModelsReady = (namespace: string): void => {
  cy.log('Waiting for LLM InferenceService to be ready');
  checkInferenceServiceState(LLM_INFERENCE_SERVICE, namespace, { checkReady: true });
};

// ---------------------------------------------------------------------------
// OGX Distribution provisioning
// ---------------------------------------------------------------------------

/**
 * Create the OGX config ConfigMap with the generated run.yaml.
 */
export const createOgxConfigMap = (namespace: string): Cypress.Chainable<CommandLineResult> => {
  const configYaml = buildOgxConfig(namespace);
  const tempFile = `/tmp/ogx_config_${Date.now()}.yaml`;

  cy.writeFile(tempFile, configYaml);

  const command =
    `oc create configmap ${OGX_CONFIG_MAP} -n ${namespace} ` +
    `--from-file=config.yaml="${tempFile}"`;

  return cy.exec(command).then((result) => {
    cy.exec(`rm -f ${tempFile}`);
    // OGXServer requires the ConfigMap to have the ogx.io/watch label
    cy.exec(`oc label configmap ${OGX_CONFIG_MAP} -n ${namespace} ogx.io/watch=true --overwrite`, {
      failOnNonZeroExit: false,
    });
    cy.log(`Created ConfigMap ${OGX_CONFIG_MAP} in namespace ${namespace}`);
    return cy.wrap(result);
  });
};

/**
 * Get the OGX core image using a multi-step discovery:
 *   1. CYPRESS_AUTORAG_OGX_IMAGE env var (explicit override)
 *   2. Operator CSV relatedImages (RHOAI clusters that ship the image)
 *   3. OGX operator controller-manager env vars (fallback for clusters
 *      where the CSV doesn't include the image yet)
 *
 * Works on both ODH and RHOAI clusters.
 */
const getOgxImage = (): Cypress.Chainable<string> => {
  const envOverride = Cypress.env('AUTORAG_OGX_IMAGE') as string;
  if (envOverride) {
    cy.log(`OGX image (env override): ${envOverride}`);
    return cy.wrap(envOverride);
  }

  // Try OGX CSV key first, fall back to legacy LlamaStack key
  const operatorNs = (Cypress.env('OPERATOR_NAMESPACE') as string) || 'redhat-ods-operator';
  const csvCmd = (key: string) =>
    `oc get csv -n ${operatorNs} -o jsonpath='{.items[*].spec.relatedImages[?(@.name=="${key}")].image}'`;

  return cy
    .exec(csvCmd('odh_ogx_core_image'), { failOnNonZeroExit: false })
    .then((ogxCsvResult) => {
      const ogxCsvImage = ogxCsvResult.stdout.trim().replace(/'/g, '');
      if (ogxCsvImage) {
        cy.log(`OGX image (CSV odh_ogx_core_image): ${ogxCsvImage}`);
        return cy.wrap(ogxCsvImage);
      }

      return cy
        .exec(csvCmd('odh_llama_stack_core_image'), { failOnNonZeroExit: false })
        .then((lsCsvResult) => {
          const lsCsvImage = lsCsvResult.stdout.trim().replace(/'/g, '');
          if (lsCsvImage) {
            cy.log(`OGX image (CSV odh_llama_stack_core_image): ${lsCsvImage}`);
            return cy.wrap(lsCsvImage);
          }

          // Fallback: discover from the operator controller-manager deployment.
          // Try OGX deployment name first, fall back to legacy LlamaStack name.
          cy.log('OGX image not found in operator CSV, checking operator deployment...');
          const appsNs =
            (Cypress.env('APPLICATIONS_NAMESPACE') as string) || 'redhat-ods-applications';
          const envJsonpath = `-o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="RELATED_IMAGE_RH_DISTRIBUTION")].value}'`;

          return cy
            .exec(
              `oc get deployment ogx-k8s-operator-controller-manager -n ${appsNs} ${envJsonpath}`,
              { failOnNonZeroExit: false },
            )
            .then((ogxDeployResult) => {
              const ogxImage = ogxDeployResult.stdout.trim().replace(/'/g, '');
              if (ogxImage) {
                cy.log(`OGX image (operator deployment): ${ogxImage}`);
                return cy.wrap(ogxImage);
              }

              return cy
                .exec(
                  `oc get deployment llama-stack-k8s-operator-controller-manager -n ${appsNs} ${envJsonpath}`,
                  { failOnNonZeroExit: false },
                )
                .then((lsDeployResult) => {
                  const lsImage = lsDeployResult.stdout.trim().replace(/'/g, '');
                  if (lsImage) {
                    cy.log(`OGX image (legacy operator deployment): ${lsImage}`);
                    return cy.wrap(lsImage);
                  }

                  throw new Error(
                    'Could not find OGX core image from operator CSV or operator deployment. ' +
                      'Set CYPRESS_AUTORAG_OGX_IMAGE env var.',
                  );
                });
            });
        });
    });
};

/**
 * Create the OGX distribution CRD in the namespace.
 * Detects which CRD type (OGXServer or LlamaStackDistribution) is available
 * and creates the appropriate resource.
 */
export const createOgxDistribution = (namespace: string): Cypress.Chainable<CommandLineResult> =>
  detectDistributionCrd().then((crd) =>
    getOgxImage().then((ogxImage) => {
      const metadata = {
        name: OGX_SERVER_NAME,
        namespace,
        annotations: { 'opendatahub.io/display-name': OGX_SERVER_NAME },
        labels: { 'opendatahub.io/dashboard': 'true' },
      };

      // OGXServer (v1beta1) and LlamaStackDistribution (v1alpha1) have different specs
      const cr =
        crd.kind === 'OGXServer'
          ? {
              apiVersion: crd.apiVersion,
              kind: crd.kind,
              metadata,
              spec: {
                distribution: { image: ogxImage },
                network: { port: OGX_PORT },
                overrideConfig: { name: OGX_CONFIG_MAP, key: 'config.yaml' },
              },
            }
          : {
              apiVersion: crd.apiVersion,
              kind: crd.kind,
              metadata,
              spec: {
                replicas: 1,
                network: { allowedFrom: { namespaces: [namespace] } },
                server: {
                  containerSpec: {
                    command: ['/bin/sh', '-c', 'llama stack run /etc/llama-stack/config.yaml'],
                    resources: {
                      requests: { cpu: '250m', memory: '500Mi' },
                      limits: { cpu: '2', memory: '12Gi' },
                    },
                    env: [
                      {
                        name: 'LLAMA_STACK_CONFIG_DIR',
                        value: '/opt/app-root/src/.llama/distributions/rh/',
                      },
                      { name: 'VLLM_TLS_VERIFY', value: 'false' },
                      { name: 'MILVUS_DB_PATH', value: '~/.llama/milvus.db' },
                    ],
                    name: 'ogx',
                    port: OGX_PORT,
                  },
                  distribution: { image: ogxImage },
                  userConfig: { configMapName: OGX_CONFIG_MAP },
                },
              },
            };

      const crYaml = yaml.dump(cr);

      const tempFile = `/tmp/ogx_cr_${Date.now()}.yaml`;
      cy.writeFile(tempFile, crYaml);

      return cy.exec(`oc apply -f "${tempFile}" -n ${namespace}`).then((result) => {
        cy.exec(`rm -f ${tempFile}`);
        cy.log(`Created ${crd.kind} ${OGX_SERVER_NAME} with image ${ogxImage}`);
        return cy.wrap(result);
      });
    }),
  );

/**
 * Get the OGX Distribution service URL.
 * The operator creates a service named <server-name>-service.
 */
export const getOgxServiceURL = (namespace: string): Cypress.Chainable<string> => {
  const svcName = `${OGX_SERVER_NAME}-service`;
  const url = `http://${svcName}.${namespace}.svc.cluster.local:${OGX_PORT}`;
  cy.log(`OGX service URL: ${url}`);
  return cy.wrap(url);
};

// ---------------------------------------------------------------------------
// Top-level orchestrator
// ---------------------------------------------------------------------------

/**
 * Provision the full AutoRAG infrastructure in a namespace:
 * Milvus, LLM model, OGX Distribution, credentials secret.
 *
 * @param namespace The project namespace to provision into.
 * @param ogxSecretName The name for the OGX credentials secret.
 */
export const provisionAutoragInfrastructure = (namespace: string, ogxSecretName: string): void => {
  cy.log(`Using vLLM CPU image: ${getVllmCpuImage()}`);

  cy.step('Deploy Milvus standalone');
  deployMilvus(namespace);

  cy.step('Deploy LLM model (InferenceService)');
  deployLlmModel(namespace);

  cy.step('Wait for Milvus to be ready');
  waitForMilvusReady(namespace);

  cy.step('Wait for LLM model to be ready');
  waitForModelsReady(namespace);

  cy.step('Create OGX config ConfigMap');
  createOgxConfigMap(namespace);

  cy.step('Create OGX Distribution CRD');
  createOgxDistribution(namespace);

  cy.step('Wait for OGX Distribution to be ready');
  waitForDistributionReady(namespace);

  cy.step('Discover OGX service URL and create credentials secret');
  getOgxServiceURL(namespace).then((ogxUrl) => {
    cy.log(`OGX service URL: ${ogxUrl}`);
    // Use a non-empty placeholder for the API key. The upstream pipeline's Python
    // code gates usage on `if base_url and api_key:` — an empty string is falsy
    // in Python, causing it to fall into the in-memory code path. "no-auth" is safe.
    createOgxSecret(namespace, ogxSecretName, ogxUrl, 'no-auth');
  });

  cy.step('Create NetworkPolicy for OGX access');
  allowOgxAccess(namespace);
};

// ---------------------------------------------------------------------------
// Cleanup helpers (resilient — each call uses failOnNonZeroExit: false)
// ---------------------------------------------------------------------------

/**
 * Clean up InferenceServices and their serving runtimes.
 */
export const cleanupAutoragModels = (namespace: string): void => {
  cy.log('Cleaning up AutoRAG LLM InferenceService and serving runtime');
  cy.exec(`oc delete inferenceservice ${LLM_INFERENCE_SERVICE} -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
  cy.exec(`oc delete servingruntime ${LLM_SERVING_RUNTIME} -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
};

/**
 * Clean up Milvus deployment and service.
 */
export const cleanupMilvus = (namespace: string): void => {
  cy.log('Cleaning up Milvus');
  cy.exec(`oc delete deployment ${MILVUS_DEPLOYMENT} -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
  cy.exec(`oc delete service ${MILVUS_DEPLOYMENT} -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
  cy.exec(`oc delete configmap milvus-config -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
};

/**
 * Clean up OGX distribution and its ConfigMap.
 * Tries both CRD names for forward/backward compatibility.
 */
export const cleanupOgx = (namespace: string): void => {
  cy.log('Cleaning up OGX distribution and ConfigMap');
  cy.exec(`oc delete ogxservers --all -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
  cy.exec(`oc delete llamastackdistribution --all -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
  cy.exec(`oc delete configmap ${OGX_CONFIG_MAP} -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
};

/**
 * Clean up the OGX credentials secret.
 */
export const cleanupOgxSecret = (namespace: string, secretName: string): void => {
  cy.log(`Cleaning up OGX secret ${secretName}`);
  cy.exec(`oc delete secret ${secretName} -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
};

/**
 * Full cleanup of all AutoRAG infrastructure resources.
 * Each cleanup is independent and resilient — failure of one doesn't block others.
 */
export const cleanupAutoragInfrastructure = (namespace: string, ogxSecretName: string): void => {
  cleanupAutoragModels(namespace);
  cleanupOgx(namespace);
  cleanupMilvus(namespace);
  cleanupOgxSecret(namespace, ogxSecretName);
};
