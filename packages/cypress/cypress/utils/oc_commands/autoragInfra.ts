/* eslint-disable cypress/no-unnecessary-waiting */

import { ensureAdminOcSession, pollUntilSuccess } from './baseCommands';
import {
  createLLMInferenceServiceWithMaaSEnabled,
  createMaaSModelRef,
  createEphemeralMaaSApiKey,
  checkMaaSAuthPolicyState,
  checkMaaSSubscriptionState,
  getGatewayExternalUrlFromLlmInferenceService,
  modelsAsAServiceNamespace,
  revokeMaaSApiKey,
  waitForMaaSModelRefReady,
} from './maas';
import { checkLLMInferenceServiceState } from './modelServing';
import type { CommandLineResult } from '../../types';
import type { AutoragMaaSFixture } from '../autoragTestFlows';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PGVECTOR_DEPLOYMENT = 'pgvector';
const PGVECTOR_PORT = 5432;
const PGVECTOR_USER = 'testuser'; // notsecret — ephemeral test DB
const PGVECTOR_PASSWORD = 'testpassword'; // notsecret — ephemeral test DB
const PGVECTOR_DATABASE = 'testdb';
const DEFAULT_PGVECTOR_IMAGE = 'quay.io/rh-aiservices-bu/postgresql-15-pgvector-c9s:latest';
const PGVECTOR_IMAGE_PLACEHOLDER = '{{PGVECTOR_IMAGE}}';

const AUTORAG_GENERATION_MODEL = 'autorag-cypress-generation-simulator';
const AUTORAG_EMBEDDING_MODEL = 'autorag-cypress-embedding-simulator';
const AUTORAG_MAAS_FIXTURE_NAMESPACE = modelsAsAServiceNamespace;
const AUTORAG_MAAS_SERVICE_ACCOUNT = 'autorag-cypress-maas';
const AUTORAG_MAAS_SERVICE_ACCOUNT_IDENTITY = `system:serviceaccount:${AUTORAG_MAAS_FIXTURE_NAMESPACE}:${AUTORAG_MAAS_SERVICE_ACCOUNT}`;
const AUTORAG_MAAS_SUBSCRIPTION = 'autorag-cypress-simulator-subscription';
const AUTORAG_MAAS_AUTH_POLICY = 'autorag-cypress-simulator-auth-policy';

type ModelListResponse = { data?: { id?: unknown }[] };

let autoragMaaSProvisioning:
  | Cypress.Chainable<AutoragMaaSFixture & { mode: 'simulator' }>
  | undefined;
let autoragMaaSFixture: (AutoragMaaSFixture & { mode: 'simulator' }) | undefined;

const getPgvectorImage = (): string =>
  (Cypress.env('AUTORAG_PGVECTOR_IMAGE') as string) || DEFAULT_PGVECTOR_IMAGE;

// ---------------------------------------------------------------------------
// Vector store provisioning
// ---------------------------------------------------------------------------

const applyVectorStoreFixture = (namespace: string): Cypress.Chainable<CommandLineResult> =>
  cy.fixture('resources/autorag/pgvector-standalone.yaml').then((content: string) => {
    const resolved = content.replace(
      new RegExp(PGVECTOR_IMAGE_PLACEHOLDER.replace(/[{}]/g, '\\$&'), 'g'),
      getPgvectorImage(),
    );
    const tempFile = `/tmp/autorag_vectorstore_${Date.now()}.yaml`;
    cy.writeFile(tempFile, resolved);
    return cy.exec(`oc apply -f "${tempFile}" -n ${namespace}`).then((result) => {
      cy.exec(`rm -f ${tempFile}`);
      return cy.wrap(result);
    });
  });

const deployVectorStore = (namespace: string): Cypress.Chainable<CommandLineResult> => {
  cy.log(`Deploying vector store in namespace ${namespace}`);
  return applyVectorStoreFixture(namespace);
};

const waitForVectorStoreReady = (
  namespace: string,
  maxAttempts = 60,
  pollIntervalMs = 5000,
): void => {
  const readyCmd = `oc get pods -n ${namespace} -l app=pgvector -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}'`;
  pollUntilSuccess(
    `${readyCmd} | grep -q True && ${readyCmd}`,
    `Vector store pod to be Ready in ${namespace}`,
    { maxAttempts, pollIntervalMs },
  );

  cy.exec(
    `oc exec deploy/${PGVECTOR_DEPLOYMENT} -n ${namespace} -- ` +
      `psql -U postgres -d ${PGVECTOR_DATABASE} -c "CREATE EXTENSION IF NOT EXISTS vector"`,
  );
};

const cleanupVectorStore = (namespace: string): void => {
  cy.log('Cleaning up vector store');
  cy.exec(`oc delete deployment ${PGVECTOR_DEPLOYMENT} -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
  cy.exec(`oc delete service ${PGVECTOR_DEPLOYMENT} -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
};

export const getVectorDatabaseConnection = (
  namespace: string,
): {
  host: string;
  port: string;
  db: string;
  user: string;
  password: string;
} => ({
  host: `${PGVECTOR_DEPLOYMENT}.${namespace}.svc.cluster.local`,
  port: `${PGVECTOR_PORT}`,
  db: PGVECTOR_DATABASE,
  user: PGVECTOR_USER,
  password: PGVECTOR_PASSWORD,
});

const applyAutoragMaaSResource = (
  createResource: () => Cypress.Chainable<CommandLineResult>,
  resourceLabel: string,
): Cypress.Chainable<CommandLineResult> =>
  createResource().then((result) => {
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to apply AutoRAG ${resourceLabel}: ${result.stderr || result.stdout}`,
      );
    }
    return result;
  });

const getSimulatorModel = (
  serviceName: string,
): Cypress.Chainable<{ url: string; modelId: string }> =>
  cy
    .exec(`oc get LLMInferenceService ${serviceName} -n ${AUTORAG_MAAS_FIXTURE_NAMESPACE} -o json`)
    .then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(`Failed to read AutoRAG simulator ${serviceName}: ${result.stderr}`);
      }
      const url = getGatewayExternalUrlFromLlmInferenceService(JSON.parse(result.stdout));
      return cy
        .request({
          method: 'GET',
          url: `${url.replace(/\/$/, '')}/v1/models`,
          failOnStatusCode: false,
          log: false,
        })
        .then((response) => {
          const payload = response.body as ModelListResponse;
          const modelId = payload.data?.find((model) => typeof model.id === 'string')?.id;
          if (response.status !== 200 || typeof modelId !== 'string' || !modelId) {
            throw new Error(`AutoRAG simulator ${serviceName} did not expose a ready model.`);
          }
          return { url, modelId };
        });
    });

const applyAutoragMaaSGovernance = (): Cypress.Chainable<CommandLineResult> =>
  cy
    .exec(
      `oc create serviceaccount ${AUTORAG_MAAS_SERVICE_ACCOUNT} -n ${AUTORAG_MAAS_FIXTURE_NAMESPACE} ` +
        `--dry-run=client -o yaml | oc apply -f -`,
      { failOnNonZeroExit: true, log: false },
    )
    .then(() =>
      cy.fixture('resources/maas/MaaSSubscriptionAutorag.yaml').then((subscriptionYaml: string) => {
        const processedSubscription = replaceAutoragMaaSPlaceholders(subscriptionYaml);
        return cy
          .exec(`cat <<'EOF' | oc apply -f -\n${processedSubscription}\nEOF`, {
            failOnNonZeroExit: true,
          })
          .then(() =>
            cy.fixture('resources/maas/MaaSAuthPolicyAutorag.yaml').then((policyYaml: string) => {
              const processedPolicy = replaceAutoragMaaSPlaceholders(policyYaml);
              return cy.exec(`cat <<'EOF' | oc apply -f -\n${processedPolicy}\nEOF`, {
                failOnNonZeroExit: true,
              });
            }),
          );
      }),
    );

const replaceAutoragMaaSPlaceholders = (yaml: string): string =>
  yaml
    .replaceAll('{{SUBSCRIPTION_NAME}}', AUTORAG_MAAS_SUBSCRIPTION)
    .replaceAll('{{POLICY_NAME}}', AUTORAG_MAAS_AUTH_POLICY)
    .replaceAll('{{MAAS_NAMESPACE}}', AUTORAG_MAAS_FIXTURE_NAMESPACE)
    .replaceAll('{{MODEL_NAMESPACE}}', AUTORAG_MAAS_FIXTURE_NAMESPACE)
    .replaceAll('{{GENERATION_MODEL_NAME}}', AUTORAG_GENERATION_MODEL)
    .replaceAll('{{EMBEDDING_MODEL_NAME}}', AUTORAG_EMBEDDING_MODEL)
    .replaceAll('{{SERVICE_ACCOUNT_IDENTITY}}', AUTORAG_MAAS_SERVICE_ACCOUNT_IDENTITY);

/**
 * Ensure the shared, lifecycle-only AutoRAG MaaS simulators exist.
 * Applying fixed names is idempotent and avoids duplicate models across specs.
 */
export const provisionAutoragMaaSFixture = (): Cypress.Chainable<
  AutoragMaaSFixture & { mode: 'simulator' }
> => {
  if (autoragMaaSFixture) {
    return cy.wrap(autoragMaaSFixture);
  }
  if (autoragMaaSProvisioning) {
    return autoragMaaSProvisioning;
  }

  ensureAdminOcSession();
  const provision = applyAutoragMaaSResource(
    () =>
      createLLMInferenceServiceWithMaaSEnabled(
        AUTORAG_MAAS_FIXTURE_NAMESPACE,
        AUTORAG_GENERATION_MODEL,
        'resources/maas/llmInferenceServiceAutoragGenerationSimulator.yaml',
      ),
    `generation LLMInferenceService ${AUTORAG_GENERATION_MODEL}`,
  )
    .then(() =>
      checkLLMInferenceServiceState(AUTORAG_GENERATION_MODEL, AUTORAG_MAAS_FIXTURE_NAMESPACE, {
        checkReady: true,
      }),
    )
    .then(() =>
      applyAutoragMaaSResource(
        () =>
          createLLMInferenceServiceWithMaaSEnabled(
            AUTORAG_MAAS_FIXTURE_NAMESPACE,
            AUTORAG_EMBEDDING_MODEL,
            'resources/maas/llmInferenceServiceAutoragEmbeddingSimulator.yaml',
          ),
        `embedding LLMInferenceService ${AUTORAG_EMBEDDING_MODEL}`,
      ),
    )
    .then(() =>
      checkLLMInferenceServiceState(AUTORAG_EMBEDDING_MODEL, AUTORAG_MAAS_FIXTURE_NAMESPACE, {
        checkReady: true,
      }),
    )
    .then(() =>
      applyAutoragMaaSResource(
        () =>
          createMaaSModelRef(
            AUTORAG_MAAS_FIXTURE_NAMESPACE,
            AUTORAG_GENERATION_MODEL,
            'resources/maas/MaaSModelRefAutoragGeneration.yaml',
          ),
        `generation MaaSModelRef ${AUTORAG_GENERATION_MODEL}`,
      ),
    )
    .then(() =>
      applyAutoragMaaSResource(
        () =>
          createMaaSModelRef(
            AUTORAG_MAAS_FIXTURE_NAMESPACE,
            AUTORAG_EMBEDDING_MODEL,
            'resources/maas/MaaSModelRefAutoragEmbedding.yaml',
          ),
        `embedding MaaSModelRef ${AUTORAG_EMBEDDING_MODEL}`,
      ),
    )
    .then(() => waitForMaaSModelRefReady(AUTORAG_GENERATION_MODEL, AUTORAG_MAAS_FIXTURE_NAMESPACE))
    .then(() => waitForMaaSModelRefReady(AUTORAG_EMBEDDING_MODEL, AUTORAG_MAAS_FIXTURE_NAMESPACE))
    .then(() => applyAutoragMaaSGovernance())
    .then(() =>
      checkMaaSSubscriptionState(AUTORAG_MAAS_SUBSCRIPTION, AUTORAG_MAAS_FIXTURE_NAMESPACE, {
        models: [AUTORAG_GENERATION_MODEL, AUTORAG_EMBEDDING_MODEL],
        phase: 'Active',
      }),
    )
    .then(() =>
      checkMaaSAuthPolicyState(AUTORAG_MAAS_AUTH_POLICY, AUTORAG_MAAS_FIXTURE_NAMESPACE, {
        phase: 'Active',
      }),
    )
    .then(() =>
      createEphemeralMaaSApiKey(
        AUTORAG_MAAS_SERVICE_ACCOUNT,
        AUTORAG_MAAS_FIXTURE_NAMESPACE,
        AUTORAG_MAAS_SUBSCRIPTION,
      ),
    )
    .then((apiKey) =>
      getSimulatorModel(AUTORAG_GENERATION_MODEL).then((generation) =>
        getSimulatorModel(AUTORAG_EMBEDDING_MODEL).then((embedding) => {
          autoragMaaSFixture = {
            mode: 'simulator',
            maasUrl: generation.url,
            apiKey: apiKey.key,
            apiKeyId: apiKey.id,
            generationModelId: generation.modelId,
            embeddingModelId: embedding.modelId,
            ownership: 'dashboard-provisioned',
            supportsCompletionResults: false,
          };
          return autoragMaaSFixture;
        }),
      ),
    );

  autoragMaaSProvisioning = provision;
  return provision;
};

/** Revoke the lifecycle key when the later AutoRAG wiring is ready to clean it up. */
export const cleanupAutoragMaaSCredential = (
  apiKeyId: string,
): Cypress.Chainable<Cypress.Response<unknown>> =>
  revokeMaaSApiKey(AUTORAG_MAAS_SERVICE_ACCOUNT, AUTORAG_MAAS_FIXTURE_NAMESPACE, apiKeyId);

// ---------------------------------------------------------------------------
// Top-level orchestrator
// ---------------------------------------------------------------------------

/**
 * Provision the project-scoped AutoRAG vector database.
 */
export const provisionVectorDatabase = (namespace: string): void => {
  deployVectorStore(namespace);
  waitForVectorStoreReady(namespace);
};

// ---------------------------------------------------------------------------
// Cleanup helpers (resilient — each call uses failOnNonZeroExit: false)
// ---------------------------------------------------------------------------

/**
 * Clean up a generated project-scoped secret.
 */
export const cleanupAutoragSecret = (namespace: string, secretName: string): void => {
  cy.log(`Cleaning up AutoRAG secret ${secretName}`);
  cy.exec(`oc delete secret ${secretName} -n ${namespace}`, {
    failOnNonZeroExit: false,
  });
};

/**
 * Clean up only resources generated in the unique AutoRAG project.
 */
export const cleanupAutoragInfrastructure = (
  namespace: string,
  maasSecretName: string,
  vectorDbSecretName: string,
): void => {
  cleanupVectorStore(namespace);
  cleanupAutoragSecret(namespace, maasSecretName);
  cleanupAutoragSecret(namespace, vectorDbSecretName);
};
