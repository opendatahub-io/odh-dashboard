import type { CommandLineResult } from '../../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const gatewayExternalName = 'gateway-external';

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

const ocGetIndicatesResourceNotFound = (result: Cypress.Exec): boolean => {
  const combined = `${result.stderr}\n${result.stdout}`;
  return /not found/i.test(combined) || /\bNotFound\b/.test(combined);
};

export type CheckMaaSSubscriptionOptions = {
  expectDeleted?: boolean;
};

/**
 * Verifies `MaaSSubscription` on the cluster (same idea as `checkLLMInferenceServiceConfigState`):
 * - `expectDeleted`: `oc get` fails with NotFound.
 */
export const checkMaaSSubscriptionState = (
  subscriptionName: string,
  namespace = 'models-as-a-service',
  options: CheckMaaSSubscriptionOptions = {},
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc get MaaSSubscription ${subscriptionName} -n ${namespace} -o json`;

  if (options.expectDeleted === true) {
    cy.log(`Checking MaaSSubscription is absent: ${subscriptionName} in namespace ${namespace}`);
    return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      if (result.code !== 0 && ocGetIndicatesResourceNotFound(result)) {
        cy.log(`✅ MaaSSubscription ${subscriptionName} is absent from namespace ${namespace}`);
        return cy.wrap(result);
      }
      if (result.code === 0) {
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
  return cy.exec(ocCommand, { failOnNonZeroExit: true }).then((result) => {
    let doc: unknown;
    try {
      doc = JSON.parse(result.stdout);
    } catch {
      throw new Error(
        `Failed to parse MaaSSubscription JSON for ${subscriptionName}: ${result.stdout}`,
      );
    }

    if (!isRecord(doc)) {
      throw new Error('Invalid MaaSSubscription JSON');
    }
    const { metadata } = doc;
    if (!isRecord(metadata)) {
      throw new Error('MaaSSubscription metadata missing');
    }

    expect(doc.kind).to.equal('MaaSSubscription');
    expect(metadata.name).to.equal(subscriptionName);

    cy.log(`✅ MaaSSubscription ${subscriptionName} exists in namespace ${namespace}`);
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
