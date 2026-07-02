import { getClusterAppsDomain } from './baseCommands';
import type { CommandLineResult } from '../../types';
import { replacePlaceholdersInYaml } from '../../utils/yaml_files';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const gatewayExternalName = 'gateway-external';
export const modelsAsAServiceNamespace = 'models-as-a-service';

/** LLM completions can exceed Cypress's default 30s `cy.request` timeout (especially with high `max_tokens`). */
const completionsRequestTimeoutMs = 180000;

/** Base URL from `status.addresses` (path includes namespace/model); prefers https when multiple gateway-external entries exist (matches typical `curl -k https://maas.apps…/…` flows). */
const getGatewayExternalUrlFromLlmInferenceService = (doc: unknown): string => {
  if (!isRecord(doc)) {
    throw new Error('Invalid LLMInferenceService JSON');
  }
  const { status } = doc;
  if (!isRecord(status)) {
    throw new Error('LLMInferenceService status missing');
  }
  const { addresses } = status;
  if (!Array.isArray(addresses)) {
    throw new Error('LLMInferenceService status.addresses missing or not an array');
  }

  const candidates: string[] = [];
  for (const entry of addresses) {
    if (!isRecord(entry)) {
      continue;
    }
    const { name, url } = entry;
    if (name !== gatewayExternalName) {
      continue;
    }
    if (typeof url === 'string' && url.length > 0) {
      candidates.push(url);
    }
  }

  if (candidates.length === 0) {
    throw new Error(`No ${gatewayExternalName} URL found in LLMInferenceService status.addresses`);
  }

  const httpsUrl = candidates.find((u) => u.startsWith('https://'));
  return httpsUrl ?? candidates[0];
};

const ocGetIndicatesResourceNotFound = (result: Cypress.Exec): boolean => {
  const combined = `${result.stderr}\n${result.stdout}`;
  return /not found/i.test(combined) || /\bNotFound\b/.test(combined);
};

/**
 * Type for MaaS Resource Condition
 */
type MaaSResourceCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
  observedGeneration?: number;
};

/**
 * Type for MaaS ModelRef Status
 */
type MaaSModelRefStatus = {
  name: string;
  namespace: string;
  ready?: boolean;
  reason?: string;
  message?: string;
};

/**
 * Type for MaaS TokenRateLimit Status
 */
type MaaSTokenRateLimitStatus = {
  name: string;
  namespace: string;
  model?: string;
  ready?: boolean;
  reason?: string;
  message?: string;
};

/**
 * Type for MaaS Resource Status
 */
type MaaSResourceStatus = {
  phase?: string;
  conditions?: MaaSResourceCondition[];
  modelRefStatuses?: MaaSModelRefStatus[];
  tokenRateLimitStatuses?: MaaSTokenRateLimitStatus[];
};

/**
 * Type for MaaS named reference (group or model ref name)
 */
type MaaSNamedReference = {
  name: string;
  namespace?: string;
};

/**
 * Type for MaaS subscription model ref spec entry
 */
type MaaSSubscriptionModelRef = {
  name: string;
  namespace: string;
  tokenRateLimits?: {
    limit: number;
    window: string;
  }[];
};

/**
 * Type for MaaSSubscription State
 */
type MaaSSubscriptionState = {
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    modelRefs?: MaaSSubscriptionModelRef[];
    owner?: {
      groups?: MaaSNamedReference[];
    };
    priority?: number;
  };
  status?: MaaSResourceStatus;
};

/**
 * Type for MaaSAuthPolicy State
 */
type MaaSAuthPolicyState = {
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    subjects?: {
      groups?: MaaSNamedReference[];
    };
    modelRefs?: MaaSNamedReference[];
  };
  status?: MaaSResourceStatus;
};

export type CheckMaaSOptions = {
  expectDeleted?: boolean;
  groups?: string[];
  models?: string[];
  phase?: string;
};

export const cleanupSubscription = (
  subscriptionName: string,
  namespace: string,
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc delete MaaSSubscription ${subscriptionName} -n ${namespace}`;
  cy.log(`Executing delete subscription command: ${ocCommand}`);
  return cy.exec(ocCommand, { failOnNonZeroExit: false });
};

export const cleanupAuthPolicy = (
  authPolicyName: string,
  namespace: string,
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc delete MaaSAuthPolicy ${authPolicyName} -n ${namespace}`;
  cy.log(`Executing delete auth policy command: ${ocCommand}`);
  return cy.exec(ocCommand, { failOnNonZeroExit: false });
};

/**
 * Deletes a single API key row from the Postgres `api_keys` table by name.
 *
 * Credentials are read from the `postgres-creds` secret in APPLICATIONS_NAMESPACE.
 * Intended for E2E cleanup of keys created by Cypress tests (matched on `name`).
 *
 * @param apiKeyName Display name of the API key to delete (same value used in the UI).
 */
export const cleanupApiKeys = (apiKeyName: string): Cypress.Chainable<CommandLineResult> => {
  const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE') as string;
  const escapedName = apiKeyName.replace(/'/g, "''");
  cy.log(`Deleting API key "${apiKeyName}" from Postgres api_keys table`);

  return cy
    .exec(
      `oc get secret postgres-creds -n ${applicationNamespace} -o jsonpath='{.data.POSTGRES_USER}' | base64 -d`,
      { failOnNonZeroExit: false },
    )
    .then((userResult) => {
      const pgUser = userResult.stdout.trim();
      return cy
        .exec(
          `oc get secret postgres-creds -n ${applicationNamespace} -o jsonpath='{.data.POSTGRES_DB}' | base64 -d`,
          { failOnNonZeroExit: false },
        )
        .then((dbResult) => {
          const pgDb = dbResult.stdout.trim();
          return cy.exec(
            `oc exec -n ${applicationNamespace} deployment/postgres -- psql -U "${pgUser}" -d "${pgDb}" -c "DELETE FROM api_keys WHERE name = '${escapedName}';"`,
            { failOnNonZeroExit: false },
          );
        });
    });
};

/**
 * Creates an LLMInferenceService with MaaS enabled by applying a YAML fixture.
 * Substitutes `{{PROJECT_NAME}}` and `{{MODEL_NAME}}` placeholders in the fixture.
 *
 * @param projectName - The namespace/project where the LLMInferenceService will be created
 * @param modelName - The name for the LLMInferenceService and model
 * @param fixturePath - Path to the YAML fixture file (relative to cypress/fixtures)
 * @returns Cypress.Chainable with the command result
 */
export const createLLMInferenceServiceWithMaaSEnabled = (
  projectName: string,
  modelName: string,
  connectionName: string,
  fixturePath: string,
): Cypress.Chainable<CommandLineResult> => {
  cy.log(`Creating LLMInferenceService "${modelName}" in namespace "${projectName}"`);

  return cy.fixture(fixturePath).then((yamlContent: string) => {
    const replacements = {
      PROJECT_NAME: projectName,
      MODEL_NAME: modelName,
      CONNECTION_NAME: connectionName,
    };
    const processedYaml = replacePlaceholdersInYaml(yamlContent, replacements);

    const ocCommand = `cat <<'EOF' | oc apply -f -
${processedYaml}
EOF`;

    cy.log(`Applying LLMInferenceService YAML for "${modelName}" in "${projectName}"`);
    return cy.exec(ocCommand, { failOnNonZeroExit: false });
  });
};

/**
 * Creates a MaaSModelRef by applying a YAML fixture.
 * Substitutes `{{PROJECT_NAME}}` and `{{MODEL_NAME}}` placeholders in the fixture.
 *
 * @param projectName - The namespace/project where the MaaSModelRef will be created
 * @param modelName - The name for the MaaSModelRef (should match the LLMInferenceService name)
 * @param fixturePath - Path to the YAML fixture file (relative to cypress/fixtures)
 * @returns Cypress.Chainable with the command result
 */
export const createMaaSModelRef = (
  projectName: string,
  modelName: string,
  fixturePath = 'resources/modelsAsService/MaaSModelRef.yaml',
): Cypress.Chainable<CommandLineResult> => {
  cy.log(`Creating MaaSModelRef "${modelName}" in namespace "${projectName}"`);

  return cy.fixture(fixturePath).then((yamlContent: string) => {
    const replacements = {
      PROJECT_NAME: projectName,
      MODEL_NAME: modelName,
    };
    const processedYaml = replacePlaceholdersInYaml(yamlContent, replacements);

    const ocCommand = `cat <<'EOF' | oc apply -f -
${processedYaml}
EOF`;

    cy.log(`Applying MaaSModelRef YAML for "${modelName}" in "${projectName}"`);
    return cy.exec(ocCommand, { failOnNonZeroExit: false });
  });
};

const parseMaaSSubscriptionDoc = (
  subscriptionName: string,
  stdout: string,
): MaaSSubscriptionState => {
  let doc: MaaSSubscriptionState;
  try {
    doc = JSON.parse(stdout) as MaaSSubscriptionState;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse MaaSSubscription JSON for ${subscriptionName}: ${errorMsg}`);
  }

  expect(doc.kind).to.equal('MaaSSubscription');
  expect(doc.metadata?.name).to.equal(subscriptionName);

  return doc;
};

const parseMaaSAuthPolicyDoc = (policyName: string, stdout: string): MaaSAuthPolicyState => {
  let doc: MaaSAuthPolicyState;
  try {
    doc = JSON.parse(stdout) as MaaSAuthPolicyState;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse MaaSAuthPolicy JSON for ${policyName}: ${errorMsg}`);
  }

  expect(doc.kind).to.equal('MaaSAuthPolicy');
  expect(doc.metadata?.name).to.equal(policyName);

  return doc;
};

const subscriptionOptionsMet = (
  doc: MaaSSubscriptionState,
  options: CheckMaaSOptions,
): string | undefined => {
  if (options.models) {
    const modelNames = getSubscriptionModelRefNames(doc);
    const expected = [...options.models].toSorted();
    const actual = [...modelNames].toSorted();
    if (expected.length !== actual.length || !expected.every((name, i) => name === actual[i])) {
      return `models: expected [${expected.join(', ')}], got [${actual.join(', ')}]`;
    }
  }
  if (options.phase && doc.status?.phase !== options.phase) {
    return `phase: expected ${options.phase}, got ${doc.status?.phase ?? 'Unknown'}`;
  }
  return undefined;
};

const authPolicyOptionsMet = (
  doc: MaaSAuthPolicyState,
  options: CheckMaaSOptions,
): string | undefined => {
  if (options.groups) {
    const groupNames = getAuthPolicyGroupNames(doc);
    const expected = [...options.groups].toSorted();
    const actual = [...groupNames].toSorted();
    if (expected.length !== actual.length || !expected.every((name, i) => name === actual[i])) {
      return `groups: expected [${expected.join(', ')}], got [${actual.join(', ')}]`;
    }
  }
  if (options.phase && doc.status?.phase !== options.phase) {
    return `phase: expected ${options.phase}, got ${doc.status?.phase ?? 'Unknown'}`;
  }
  return undefined;
};

const getAuthPolicyGroupNames = (doc: MaaSAuthPolicyState): string[] => {
  const groups = doc.spec?.subjects?.groups;
  if (!groups) {
    throw new Error('MaaSAuthPolicy spec.subjects.groups missing');
  }
  return groups.map((group, index) => {
    if (!group.name) {
      throw new Error(`MaaSAuthPolicy spec.subjects.groups[${index}] is missing name`);
    }
    return group.name;
  });
};

const getSubscriptionModelRefNames = (doc: MaaSSubscriptionState): string[] => {
  const modelRefs = doc.spec?.modelRefs;
  if (!modelRefs) {
    throw new Error('MaaSSubscription spec.modelRefs missing');
  }
  return modelRefs.map((modelRef, index) => {
    if (!modelRef.name) {
      throw new Error(`MaaSSubscription spec.modelRefs[${index}] is missing name`);
    }
    return modelRef.name;
  });
};

/**
 * Verifies `MaaSSubscription` on the cluster (same idea as `checkLLMInferenceServiceConfigState`):
 * - `expectDeleted`: `oc get` fails with NotFound.
 */
export const checkMaaSSubscriptionState = (
  subscriptionName: string,
  namespace = modelsAsAServiceNamespace,
  options: CheckMaaSOptions = {},
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc get MaaSSubscription ${subscriptionName} -n ${namespace} -o json`;

  if (options.expectDeleted === true) {
    cy.log(`Checking MaaSSubscription is absent: ${subscriptionName} in namespace ${namespace}`);
    return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      if (result.exitCode !== 0 && ocGetIndicatesResourceNotFound(result)) {
        cy.log(`✅ MaaSSubscription ${subscriptionName} is absent from namespace ${namespace}`);
        return cy.wrap(result);
      }
      if (result.exitCode === 0) {
        throw new Error(
          `MaaSSubscription ${subscriptionName} still exists in namespace ${namespace}`,
        );
      }
      throw new Error(
        `Unexpected oc error while verifying MaaSSubscription deletion: ${result.stderr}`,
      );
    });
  }
  cy.log(`Checking MaaSSubscription exists: ${subscriptionName} in namespace ${namespace}`);
  const resourceLabel = `MaaSSubscription ${subscriptionName} in namespace ${namespace}`;

  return cy.exec(ocCommand, { failOnNonZeroExit: true }).then((result) => {
    const doc = parseMaaSSubscriptionDoc(subscriptionName, result.stdout);

    if (options.phase || options.models) {
      const failureReason = subscriptionOptionsMet(doc, options);
      if (failureReason) {
        throw new Error(`${resourceLabel} did not meet expected state. ${failureReason}`);
      }
      cy.log(`✅ ${resourceLabel} conditions met`);
    } else {
      cy.log(`✅ ${resourceLabel} exists`);
    }

    return cy.wrap(result);
  });
};

/**
 * Verifies `MaaSAuthPolicy` state on the cluster. Validatest the groups and phase in the policy.
 */
export const checkMaaSAuthPolicyState = (
  policyName: string,
  namespace = modelsAsAServiceNamespace,
  options: CheckMaaSOptions = {},
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc get MaaSAuthPolicy ${policyName} -n ${namespace} -o json`;

  if (options.expectDeleted === true) {
    cy.log(`Checking MaaSAuthPolicy is absent: ${policyName} in namespace ${namespace}`);
    return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      if (result.exitCode !== 0 && ocGetIndicatesResourceNotFound(result)) {
        cy.log(`✅ MaaSAuthPolicy ${policyName} is absent from namespace ${namespace}`);
        return cy.wrap(result);
      }
      if (result.exitCode === 0) {
        throw new Error(`MaaSAuthPolicy ${policyName} still exists in namespace ${namespace}`);
      }
      throw new Error(
        `Unexpected oc error while verifying MaaSAuthPolicy deletion: ${result.stderr}`,
      );
    });
  }

  cy.log(`Checking MaaSAuthPolicy exists: ${policyName} in namespace ${namespace}`);
  const resourceLabel = `MaaSAuthPolicy ${policyName} in namespace ${namespace}`;

  return cy.exec(ocCommand, { failOnNonZeroExit: true }).then((result) => {
    const doc = parseMaaSAuthPolicyDoc(policyName, result.stdout);

    if (options.phase || options.groups) {
      const failureReason = authPolicyOptionsMet(doc, options);
      if (failureReason) {
        throw new Error(`${resourceLabel} did not meet expected state. ${failureReason}`);
      }
      cy.log(`✅ ${resourceLabel} conditions met`);
    } else {
      cy.log(`✅ ${resourceLabel} exists`);
    }

    return cy.wrap(result);
  });
};

export const MAAS_COMPLETIONS_DEFAULT_MAX_ATTEMPTS = 24;

const MAAS_COMPLETIONS_DEFAULT_RETRY_INTERVAL_MS = 5000;

export type VerifyMaaSModelInferencingOptions = {
  maxAttempts?: number;
  retryIntervalMs?: number;
};

/**
 * Verify the model is accessible with a token via the MaaS completions API (same shape as):
 * `curl -k {gateway-external-base}/v1/completions -H "Content-Type: application/json"
 *   -H "Authorization: Bearer …" -d '{"model":"<name>","prompt":"Today is","max_tokens":512,"temperature":1}'`
 *
 * Resolves `{gateway-external-base}` from `LLMInferenceService.status.addresses`, then POSTs to `{base}/v1/completions`.
 * Uses `strictSSL: false` on the request so self-signed cluster ingress TLS matches `curl -k`.
 * Uses an extended `cy.request` timeout because completions can run longer than the default 30s.
 *
 * Retries the POST when the gateway returns transient statuses (like 400/429/502/503/504), up to `maxAttempts`,
 * with `retryIntervalMs` between attempts (same polling pattern as other `maxAttempts` utilities in `oc_commands`).
 *
 * @param llmInferenceServiceName `metadata.name` of the LLMInferenceService (JSON `model` field, same as curl).
 * @param namespace Namespace of the LLMInferenceService.
 * @param apiKey The API key to use for the request.
 * @param options Optional retry budget; defaults are {@link MAAS_COMPLETIONS_DEFAULT_MAX_ATTEMPTS} attempts and 5000ms between attempts.
 * @returns Cypress.Chainable whose `url` is the full completions URL used for the POST.
 */
export const verifyMaaSModelInferencing = (
  llmInferenceServiceName: string,
  namespace: string,
  apiKey: string,
  options: VerifyMaaSModelInferencingOptions = {},
): Cypress.Chainable<{ url: string; response: Cypress.Response<unknown> }> => {
  const maxAttempts = options.maxAttempts ?? MAAS_COMPLETIONS_DEFAULT_MAX_ATTEMPTS;
  const retryIntervalMs = options.retryIntervalMs ?? MAAS_COMPLETIONS_DEFAULT_RETRY_INTERVAL_MS;
  const approximateRetryWindowSec = (maxAttempts * retryIntervalMs) / 1000;

  const sanitizedName = llmInferenceServiceName.replace(/[^a-zA-Z0-9_-]/g, '');
  const sanitizedNamespace = namespace.replace(/[^a-zA-Z0-9_-]/g, '');
  const ocCommand = `oc get LLMInferenceService ${sanitizedName} -n ${sanitizedNamespace} -o json`;

  return cy.exec(ocCommand, { failOnNonZeroExit: true }).then((result) => {
    let doc: unknown;
    try {
      doc = JSON.parse(result.stdout);
    } catch {
      throw new Error(
        `Failed to parse LLMInferenceService JSON for ${llmInferenceServiceName}: ${result.stdout}`,
      );
    }

    const baseUrl = getGatewayExternalUrlFromLlmInferenceService(doc).replace(/\/$/, '');
    const url = `${baseUrl}/v1/completions`;

    cy.step(
      `MaaS completions POST with retries (max ${maxAttempts} attempts, ~${approximateRetryWindowSec}s backoff window)`,
    );

    const maxTokensField = 'max_tokens';
    const requestBody: Record<string, string | number> = {
      model: llmInferenceServiceName,
      prompt: 'Today is',
      temperature: 1,
    };
    requestBody[maxTokensField] = 256;

    const makeRequest = (
      attemptNumber: number,
    ): Cypress.Chainable<{ url: string; response: Cypress.Response<unknown> }> => {
      cy.log(`Request attempt ${attemptNumber} of ${maxAttempts}`);
      cy.log(`Request URL: ${url}`);
      cy.log(`Request method: POST`);
      cy.log(
        `Request headers: ${JSON.stringify({
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: 'Bearer <redacted>' }),
        })}`,
      );
      cy.log(`Request body: ${JSON.stringify(requestBody)}`);
      cy.log(`Request timeout: ${completionsRequestTimeoutMs}ms`);
      const requestOptions: Partial<Cypress.RequestOptions> & { strictSSL: boolean } = {
        method: 'POST',
        url,
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
        body: requestBody,
        failOnStatusCode: false,
        strictSSL: false,
        timeout: completionsRequestTimeoutMs,
      };
      return cy.request(requestOptions).then((response) => {
        cy.log(`Response status: ${response.status}`);
        cy.log(`Response body: ${JSON.stringify(response.body)}`);

        if (response.status === 200) {
          return cy.wrap({ url, response });
        }

        if (
          (response.status === 503 || response.status === 502 || response.status === 400) &&
          attemptNumber < maxAttempts
        ) {
          cy.log(
            `Transient completions response (${response.status}), retrying in ${
              retryIntervalMs / 1000
            } seconds...`,
          );
          // eslint-disable-next-line cypress/no-unnecessary-waiting -- backoff between inference POST retries
          return cy.wait(retryIntervalMs).then(() => makeRequest(attemptNumber + 1));
        }

        if (attemptNumber >= maxAttempts) {
          cy.log(`Maximum retry attempts (${maxAttempts}) reached, returning last response`);
          return cy.wrap({ url, response });
        }

        return cy.wrap({ url, response });
      });
    };

    return makeRequest(1);
  });
};

export const ListMaaSModels = (
  token: string,
): Cypress.Chainable<{ url: string; response: Cypress.Response<unknown> }> => {
  return getClusterAppsDomain().then((clusterDomain) => {
    const url = `https://maas.${clusterDomain}/v1/models`;

    cy.log(`Request URL: ${url}`);
    cy.log(`Request method: GET`);
    cy.log(
      `Request headers: ${JSON.stringify({
        'Content-Type': 'application/json',
        ...(token && { Authorization: 'Bearer <redacted>' }),
      })}`,
    );

    const requestOptions: Partial<Cypress.RequestOptions> & { strictSSL: boolean } = {
      method: 'GET',
      url,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      failOnStatusCode: false,
      strictSSL: false,
      timeout: completionsRequestTimeoutMs,
    };

    return cy.request(requestOptions).then((response) => {
      cy.log(`Response status: ${response.status}`);
      cy.log(`Response body: ${JSON.stringify(response.body)}`);
      return cy.wrap({ url, response });
    });
  });
};
