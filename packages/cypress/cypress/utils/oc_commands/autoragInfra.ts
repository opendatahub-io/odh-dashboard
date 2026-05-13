/* eslint-disable cypress/no-unnecessary-waiting */
import * as yaml from 'js-yaml';

import { pollUntilSuccess } from './baseCommands';
import { allowLlamaStackAccess } from './llamaStackNetworkPolicy';
import {
  waitForLlamaStackOperatorReady,
  waitForLlamaStackDistributionReady,
} from './llamaStackDistribution';
import { createLlamaStackSecret } from './llamaStackSecret';
import { checkInferenceServiceState } from './modelServing';
import type { CommandLineResult } from '../../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LLM_SERVING_RUNTIME = 'autorag-vllm-cpu-runtime';
const LLM_INFERENCE_SERVICE = 'autorag-llm';
const MILVUS_DEPLOYMENT = 'milvus';
const MILVUS_PORT = 19530;
const LSD_NAME = 'autorag-lsd';
const LSD_CONFIG_MAP = 'llama-stack-config';
const LSD_PORT = 8321;

// Embedding is handled by LlamaStack's built-in inline::sentence-transformers provider.
// No external InferenceService needed — it runs inside the LlamaStack pod on CPU.
// Uses all-MiniLM-L6-v2: public (no HuggingFace auth), small (22M params), 384-dim.
const INLINE_EMBEDDING_MODEL_ID = 'sentence-transformers/all-MiniLM-L6-v2';
const INLINE_EMBEDDING_DIMENSION = 384;

// Default images — overridable via CYPRESS_ env vars for disconnected clusters
// LLM runtime: used by gen-ai tests (vllm_cpu_amd64_runtime.yaml)
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
// LlamaStack operator management (AutoRAG-owned, independent of gen-ai)
// ---------------------------------------------------------------------------

const DSC_RESOURCE = 'datasciencecluster default-dsc';

/**
 * Ensure the LlamaStack operator is Managed and ready.
 * If already Managed, this is a no-op. Otherwise, patches the DSC and waits.
 */
export const ensureLlamaStackOperator = (): void => {
  cy.exec(
    `oc get ${DSC_RESOURCE} -o jsonpath='{.spec.components.llamastackoperator.managementState}'`,
  ).then((result) => {
    const state = result.stdout.trim().replace(/'/g, '');
    if (state === 'Managed') {
      cy.log('LlamaStack operator already Managed, skipping');
      return;
    }

    cy.log(`LlamaStack operator is "${state}", patching to Managed`);
    cy.exec(
      `oc patch ${DSC_RESOURCE} --type=merge -p '{"spec":{"components":{"llamastackoperator":{"managementState":"Managed"}}}}'`,
    );

    cy.log('Waiting for LlamaStack operator to be ready');
    waitForLlamaStackOperatorReady();
  });
};

/**
 * Reset the LlamaStack operator to Removed state.
 * Only call this if the operator was not Managed before the test started.
 */
export const resetLlamaStackOperator = (): void => {
  cy.log('Resetting LlamaStack operator to Removed');
  cy.exec(
    `oc patch ${DSC_RESOURCE} --type=merge -p '{"spec":{"components":{"llamastackoperator":{"managementState":"Removed"}}}}'`,
    { failOnNonZeroExit: false },
  );
};

/**
 * Check if the LlamaStack operator is currently Managed.
 */
export const isLlamaStackOperatorManaged = (): Cypress.Chainable<boolean> =>
  cy
    .exec(
      `oc get ${DSC_RESOURCE} -o jsonpath='{.spec.components.llamastackoperator.managementState}'`,
      { failOnNonZeroExit: false },
    )
    .then((result) => cy.wrap(result.stdout.trim().replace(/'/g, '') === 'Managed'));

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
// LlamaStack config generation
// ---------------------------------------------------------------------------

/**
 * Build the LlamaStack run.yaml configuration content.
 *
 * This mirrors the structure from the gen-ai BFF's NewDefaultLlamaStackConfig()
 * in packages/gen-ai/bff/internal/integrations/kubernetes/llamastack_config.go.
 *
 * The config registers:
 * - An LLM inference provider (remote::vllm) pointing at the LLM InferenceService
 * - A sentence-transformers provider for inline embedding (runs inside LlamaStack pod, no GPU needed)
 * - An LLM inference provider (remote::vllm) pointing at the LLM InferenceService
 * - A Milvus vector_io provider (remote::milvus) pointing at the Milvus service
 * - Registered models for LLM and embedding (inline)
 */
/* eslint-disable camelcase -- LlamaStack config.yaml requires snake_case keys */
const buildLlamaStackConfig = (namespace: string): string => {
  const llmUrl = `http://${LLM_INFERENCE_SERVICE}-predictor.${namespace}.svc.cluster.local/v1`;
  const milvusUri = `http://${MILVUS_DEPLOYMENT}.${namespace}.svc.cluster.local:${MILVUS_PORT}`;

  const config = {
    version: '2',
    distro_name: 'rh',
    apis: [
      'responses',
      'datasetio',
      'files',
      'inference',
      'safety',
      'scoring',
      'tool_runtime',
      'vector_io',
    ],
    providers: {
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
      datasetio: [
        {
          provider_id: 'huggingface',
          provider_type: 'remote::huggingface',
          config: {
            kvstore: { namespace: 'datasetio::huggingface', backend: 'kv_default' },
          },
        },
      ],
      scoring: [
        { provider_id: 'basic', provider_type: 'inline::basic', config: {} },
        { provider_id: 'llm-as-judge', provider_type: 'inline::llm-as-judge', config: {} },
      ],
      eval: [],
      tool_runtime: [
        { provider_id: 'file-search', provider_type: 'inline::file-search', config: {} },
        {
          provider_id: 'model-context-protocol',
          provider_type: 'remote::model-context-protocol',
          config: {},
        },
      ],
      safety: [],
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
        model_id: INLINE_EMBEDDING_MODEL_ID,
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
      port: LSD_PORT,
    },
  };

  return `# Llama Stack Configuration (generated by AutoRAG E2E infrastructure)\n${yaml.dump(
    config,
    { lineWidth: -1 },
  )}`;
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
 * Embedding is handled inline by LlamaStack (no external InferenceService).
 */
export const waitForModelsReady = (namespace: string): void => {
  cy.log('Waiting for LLM InferenceService to be ready');
  checkInferenceServiceState(LLM_INFERENCE_SERVICE, namespace, { checkReady: true });
};

// ---------------------------------------------------------------------------
// LlamaStack Distribution provisioning
// ---------------------------------------------------------------------------

/**
 * Create the llama-stack-config ConfigMap with the generated run.yaml.
 */
export const createLlamaStackConfigMap = (
  namespace: string,
): Cypress.Chainable<CommandLineResult> => {
  const configYaml = buildLlamaStackConfig(namespace);
  const tempFile = `/tmp/llama_stack_config_${Date.now()}.yaml`;

  // Write the config content to a temp file, then create ConfigMap from it
  cy.writeFile(tempFile, configYaml);

  const command =
    `oc create configmap ${LSD_CONFIG_MAP} -n ${namespace} ` +
    `--from-file=config.yaml="${tempFile}"`;

  return cy.exec(command).then((result) => {
    cy.exec(`rm -f ${tempFile}`);
    cy.log(`Created ConfigMap ${LSD_CONFIG_MAP} in namespace ${namespace}`);
    return cy.wrap(result);
  });
};

/**
 * Get the LlamaStack core image using a multi-step discovery:
 *   1. CYPRESS_AUTORAG_LLAMASTACK_IMAGE env var (explicit override)
 *   2. Operator CSV relatedImages (RHOAI clusters that ship the image)
 *   3. LlamaStack operator controller-manager env vars (fallback for clusters
 *      where the CSV doesn't include the image yet)
 *
 * Works on both ODH and RHOAI clusters.
 */
const getLlamaStackImage = (): Cypress.Chainable<string> => {
  const envOverride = Cypress.env('AUTORAG_LLAMASTACK_IMAGE') as string;
  if (envOverride) {
    cy.log(`LlamaStack image (env override): ${envOverride}`);
    return cy.wrap(envOverride);
  }

  const operatorNs = (Cypress.env('OPERATOR_NAMESPACE') as string) || 'redhat-ods-operator';
  return cy
    .exec(
      `oc get csv -n ${operatorNs} -o jsonpath='{.items[*].spec.relatedImages[?(@.name=="odh_llama_stack_core_image")].image}'`,
    )
    .then((result) => {
      const csvImage = result.stdout.trim().replace(/'/g, '');
      if (csvImage) {
        cy.log(`LlamaStack image (CSV): ${csvImage}`);
        return cy.wrap(csvImage);
      }

      // Fallback: discover from the LlamaStack operator's controller-manager deployment.
      // The operator stores its managed image in the RELATED_IMAGE_RH_DISTRIBUTION env var.
      cy.log(
        'LlamaStack image not found in operator CSV, checking LlamaStack operator deployment...',
      );
      const appsNs = (Cypress.env('APPLICATIONS_NAMESPACE') as string) || 'redhat-ods-applications';
      return cy
        .exec(
          `oc get deployment llama-stack-k8s-operator-controller-manager -n ${appsNs} ` +
            `-o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="RELATED_IMAGE_RH_DISTRIBUTION")].value}'`,
          { failOnNonZeroExit: false },
        )
        .then((deployResult) => {
          const deployImage = deployResult.stdout.trim().replace(/'/g, '');
          if (deployImage) {
            cy.log(`LlamaStack image (operator deployment): ${deployImage}`);
            return cy.wrap(deployImage);
          }

          throw new Error(
            'Could not find LlamaStack core image from operator CSV or LlamaStack operator deployment. ' +
              'Set CYPRESS_AUTORAG_LLAMASTACK_IMAGE env var.',
          );
        });
    });
};

/**
 * Create the LlamaStackDistribution CRD in the namespace.
 * Uses distribution.image (discovered from operator) instead of distribution.name
 * for compatibility with both ODH and RHOAI clusters.
 */
export const createLlamaStackDistribution = (
  namespace: string,
): Cypress.Chainable<CommandLineResult> =>
  getLlamaStackImage().then((lsImage) => {
    const lsdYaml = yaml.dump({
      apiVersion: 'llamastack.io/v1alpha1',
      kind: 'LlamaStackDistribution',
      metadata: {
        name: LSD_NAME,
        namespace,
        annotations: { 'opendatahub.io/display-name': LSD_NAME },
        labels: { 'opendatahub.io/dashboard': 'true' },
      },
      spec: {
        replicas: 1,
        network: {
          allowedFrom: { namespaces: [namespace] },
        },
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
            name: 'llama-stack',
            port: LSD_PORT,
          },
          distribution: { image: lsImage },
          userConfig: { configMapName: LSD_CONFIG_MAP },
        },
      },
    });

    const tempFile = `/tmp/lsd_cr_${Date.now()}.yaml`;
    cy.writeFile(tempFile, lsdYaml);

    return cy.exec(`oc apply -f "${tempFile}" -n ${namespace}`).then((result) => {
      cy.exec(`rm -f ${tempFile}`);
      cy.log(`Created LlamaStackDistribution ${LSD_NAME} with image ${lsImage}`);
      return cy.wrap(result);
    });
  });

/**
 * Get the LlamaStack Distribution service URL.
 * The operator creates a service named <lsd-name>-service.
 */
export const getLlamaStackServiceURL = (namespace: string): Cypress.Chainable<string> => {
  const svcName = `${LSD_NAME}-service`;
  const url = `http://${svcName}.${namespace}.svc.cluster.local:${LSD_PORT}`;
  cy.log(`LlamaStack service URL: ${url}`);
  return cy.wrap(url);
};

// ---------------------------------------------------------------------------
// Top-level orchestrator
// ---------------------------------------------------------------------------

/**
 * Provision the full AutoRAG infrastructure in a namespace:
 * Milvus, LLM model, embedding model, LlamaStack Distribution, credentials secret.
 *
 * @param namespace The project namespace to provision into.
 * @param llamaStackSecretName The name for the LlamaStack credentials secret.
 */
export const provisionAutoragInfrastructure = (
  namespace: string,
  llamaStackSecretName: string,
): void => {
  cy.log(`Using vLLM CPU image: ${getVllmCpuImage()}`);

  cy.step('Deploy Milvus standalone');
  deployMilvus(namespace);

  cy.step('Deploy LLM model (InferenceService)');
  deployLlmModel(namespace);

  cy.step('Wait for Milvus to be ready');
  waitForMilvusReady(namespace);

  cy.step('Wait for LLM model to be ready');
  waitForModelsReady(namespace);

  cy.step('Create LlamaStack config ConfigMap');
  createLlamaStackConfigMap(namespace);

  cy.step('Create LlamaStackDistribution CRD');
  createLlamaStackDistribution(namespace);

  cy.step('Wait for LlamaStackDistribution to be ready');
  waitForLlamaStackDistributionReady(namespace);

  cy.step('Discover LSD service URL and create credentials secret');
  getLlamaStackServiceURL(namespace).then((lsdUrl) => {
    cy.log(`LlamaStack service URL: ${lsdUrl}`);
    // Use a non-empty placeholder for the API key. The upstream pipeline's Python
    // code gates LlamaStack usage on `if base_url and api_key:` — an empty string
    // is falsy in Python, causing it to fall into the in-memory code path which
    // requires chat_model_url/embedding_model_url params we don't set.
    // LlamaStack accepts any token when auth is disabled, so "no-auth" is safe.
    createLlamaStackSecret(namespace, llamaStackSecretName, lsdUrl, 'no-auth');
  });

  cy.step('Create NetworkPolicy for LlamaStack access');
  allowLlamaStackAccess(namespace);
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
 * Clean up LlamaStackDistribution and its ConfigMap.
 */
export const cleanupLlamaStack = (namespace: string): void => {
  cy.log('Cleaning up LlamaStackDistribution and ConfigMap');
  cy.exec(`oc delete llamastackdistribution --all -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
  cy.exec(`oc delete configmap ${LSD_CONFIG_MAP} -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
};

/**
 * Clean up the LlamaStack credentials secret.
 */
export const cleanupLlamaStackSecret = (namespace: string, secretName: string): void => {
  cy.log(`Cleaning up LlamaStack secret ${secretName}`);
  cy.exec(`oc delete secret ${secretName} -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
};

/**
 * Full cleanup of all AutoRAG infrastructure resources.
 * Each cleanup is independent and resilient — failure of one doesn't block others.
 */
export const cleanupAutoragInfrastructure = (
  namespace: string,
  llamaStackSecretName: string,
): void => {
  cleanupAutoragModels(namespace);
  cleanupLlamaStack(namespace);
  cleanupMilvus(namespace);
  cleanupLlamaStackSecret(namespace, llamaStackSecretName);
};
