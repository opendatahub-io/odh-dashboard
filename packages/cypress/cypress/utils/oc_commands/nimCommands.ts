import type { PollOptions } from './baseCommands';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const quoteForShell = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

/**
 * Checks if the NIM OdhApplication exists on the cluster.
 * @param namespace The namespace to check for the NIM application.
 * @returns A Cypress chainable that returns true if the application exists, false otherwise.
 */
export const checkNIMApplicationExists = (
  namespace: string = Cypress.env('APPLICATIONS_NAMESPACE'),
): Cypress.Chainable<boolean> => {
  const ns = namespace ? `-n ${namespace}` : '';
  const checkCommand = `oc get odhapplication/nvidia-nim ${ns}`;

  cy.log(`Checking if NIM application exists: ${checkCommand}`);

  return cy.exec(checkCommand, { failOnNonZeroExit: false }).then((result) => {
    const exists = result.exitCode === 0;
    cy.log(`NIM application exists: ${exists}`);
    return cy.wrap(exists);
  });
};

/**
 * Applies the NVIDIA NIM OdhApplication manifest to enable NIM on the cluster.
 * @param namespace The namespace where the NIM application should be applied.
 * @returns A Cypress chainable that performs the NIM application process.
 */
export const applyNIMApplication = (
  namespace: string = Cypress.env('APPLICATIONS_NAMESPACE'),
): Cypress.Chainable<CommandLineResult> => {
  cy.log('Applying NVIDIA NIM OdhApplication manifest...');

  // Apply the NIM manifest from the fixture file using relative path
  const ns = namespace ? `-n ${namespace}` : '';
  const ocCommand = `oc apply -f cypress/fixtures/e2e/nim/nvidia-nim-app.yaml ${ns}`;

  cy.log(`Debug: Applying NIM manifest: ${ocCommand}`);
  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    cy.log(`Command exit code: ${result.exitCode}`);
    if (result.exitCode !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      const maskedStdout = maskSensitiveInfo(result.stdout);
      throw new Error(`Failed to apply NIM manifest: ${maskedStderr || maskedStdout}`);
    }
    return cy.wrap(result);
  });
};

/**
 * Deletes odh-nim-account in the APPLICATIONS_NAMESPACE.
 * @param namespace The namespace where account exist.
 * @returns A Cypress chainable that performs the account deletion process.
 */
export const deleteNIMAccount = (
  namespace: string = Cypress.env('APPLICATIONS_NAMESPACE'),
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc delete account odh-nim-account -n ${namespace}`;
  cy.log(`Executing: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.exitCode === 0) {
      // Account was successfully deleted
      cy.log(`Account deletion: ${result.stdout}`);
    } else if (result.stderr.includes('not found')) {
      // Account doesn't exist, which is fine
      cy.log('✅ NIM account does not exist - no cleanup needed');
    } else {
      // Some other error occurred
      const maskedStderr = maskSensitiveInfo(result.stderr);
      cy.log(`⚠️  Warning: Failed to delete NIM account: ${maskedStderr}`);
      cy.log('Continuing with test execution...');
    }
  });
};

/**
 * Default polling configuration for NIM account validation.
 * Uses longer timeouts since NVIDIA API validation can take up to 7 minutes.
 */
const DEFAULT_NIM_POLL_OPTIONS: Required<PollOptions> = {
  maxAttempts: 84, // 84 attempts * 5 seconds = 7 minutes total
  pollIntervalMs: 5000,
};

/**
 * Wait for the NIM account to be fully validated by polling the account status.
 * Checks for the AccountStatus condition to be True with reason AccountSuccessful.
 * This indicates that all components are ready:
 * - API key validated (APIKeyValidation)
 * - Config map created (ConfigMapUpdate)
 * - Runtime template created (TemplateUpdate)
 * - Pull secret created (SecretUpdate)
 * - Account is healthy (AccountStatus)
 *
 * @param namespace The namespace where the account exists.
 * @param options Polling options (maxAttempts, pollIntervalMs).
 * @returns A Cypress chainable that resolves when validation is complete.
 */
export const waitForNIMAccountValidation = (
  namespace: string = Cypress.env('APPLICATIONS_NAMESPACE'),
  options: PollOptions = {},
): Cypress.Chainable<CommandLineResult> => {
  const { maxAttempts, pollIntervalMs } = { ...DEFAULT_NIM_POLL_OPTIONS, ...options };
  const startTime = Date.now();
  const totalTimeout = maxAttempts * pollIntervalMs;

  const check = (attemptNumber = 1): Cypress.Chainable<CommandLineResult> => {
    // Check for AccountStatus condition with status=True and reason=AccountSuccessful
    const command = `oc get account odh-nim-account -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="AccountStatus")].reason}'`;

    return cy.exec(command, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
      const reason = result.stdout.trim();
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      if (reason === 'AccountSuccessful') {
        cy.log(`✅ NIM account AccountStatus reason is AccountSuccessful (after ${elapsedTime}s)`);
        return cy.wrap(result);
      }

      if (attemptNumber >= maxAttempts) {
        throw new Error(
          `NIM account AccountStatus reason not AccountSuccessful after ${maxAttempts} attempts (${elapsedTime}s). Current reason: ${
            reason || 'not found'
          }`,
        );
      }

      cy.log(
        `⏳ Waiting for NIM account AccountStatus (attempt ${attemptNumber}/${maxAttempts}, reason: ${
          reason || 'not found'
        }, elapsed: ${elapsedTime}s)`,
      );
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
    });
  };

  cy.step(`Polling for NIM account AccountStatus condition (max ${totalTimeout / 1000}s)`);
  return check();
};

/**
 * Verifies that a legacy NIM deployment created its InferenceService, ServingRuntime, cache PVC,
 * and token-authentication resources. The ServingRuntime check also confirms the PVC is mounted
 * at NIM's cache path.
 */
export const verifyNIMDeploymentResources = (
  inferenceServiceName: string,
  namespace: string,
  pvcName: string,
  tokenDisplayName: string,
): Cypress.Chainable<CommandLineResult> => {
  const serviceAccountName = `${inferenceServiceName}-sa`;
  const tokenSecretName = `${tokenDisplayName}-${serviceAccountName}`;

  return cy
    .exec(
      `oc get inferenceservice ${inferenceServiceName} -n ${namespace} -o jsonpath='{.spec.predictor.model.runtime}'`,
    )
    .then((runtimeResult) => {
      const servingRuntimeName = runtimeResult.stdout.trim();
      const runtimeValidationCommand =
        `oc get servingruntime ${servingRuntimeName} -n ${namespace} -o json | ` +
        `jq -e --arg pvc ${quoteForShell(pvcName)} ` +
        `'any(.spec.volumes[]?; .persistentVolumeClaim.claimName? == $pvc) and ` +
        'any(.spec.containers[]?; .name == "kserve-container" and ' +
        'any(.volumeMounts[]?; .name == $pvc and .mountPath == "/mnt/models/cache")) and ' +
        'any(.spec.containers[]?; .name == "kserve-container" and ' +
        'any(.env[]?; .name == "NIM_CACHE_PATH" and .value == "/mnt/models/cache"))\'';

      return cy
        .exec(runtimeValidationCommand)
        .then(() =>
          cy.exec(
            `oc get pvc ${pvcName} -n ${namespace} -o json | ` +
              `jq -e '.metadata.annotations["dashboard.opendatahub.io/nim-pvc"] == "true" and ` +
              `.metadata.labels["opendatahub.io/managed"] == "true"'`,
          ),
        )
        .then(() => cy.exec(`oc get serviceaccount ${serviceAccountName} -n ${namespace}`))
        .then(() => cy.exec(`oc get role ${inferenceServiceName}-view-role -n ${namespace}`))
        .then(() => cy.exec(`oc get rolebinding ${inferenceServiceName}-view -n ${namespace}`))
        .then(() => cy.exec(`oc get secret ${tokenSecretName} -n ${namespace} -o name`));
    });
};

/**
 * Waits for the NIM resources removed by the model-deployment delete action.
 */
export const waitForNIMDeploymentResourceDeletion = (
  inferenceServiceName: string,
  servingRuntimeName: string,
  pvcName: string,
  namespace: string,
  timeout = 300000,
): Cypress.Chainable<CommandLineResult> =>
  cy
    .exec(
      `oc wait --for=delete inferenceservice/${inferenceServiceName} servingruntime/${servingRuntimeName} pvc/${pvcName} -n ${namespace} --timeout=${Math.floor(
        timeout / 1000,
      )}s`,
      { timeout },
    )
    .then((result: CommandLineResult) => cy.wrap(result));

/**
 * Uses the NIM OpenAI-compatible chat-completions endpoint through the deployment's external route.
 * When authentication is enabled, the service-account token is kept in a shell variable and never
 * written to Cypress output.
 */
export const curlNIMChatCompletions = (
  inferenceServiceName: string,
  namespace: string,
  tokenDisplayName: string,
  modelId: string,
  options: {
    authenticate?: boolean;
  } = {},
): Cypress.Chainable<CommandLineResult> => {
  const { authenticate = true } = options;
  // The unauthenticated path proves the external route rejects requests without a token.
  const expectedStatus = authenticate ? 200 : 401;
  const tokenSecretName = `${tokenDisplayName}-${inferenceServiceName}-sa`;

  return cy
    .exec(
      `oc get inferenceservice ${inferenceServiceName} -n ${namespace} -o jsonpath='{.status.url}'`,
      {
        log: false,
      },
    )
    .then((endpointResult: CommandLineResult) => {
      let endpoint: URL;

      try {
        endpoint = new URL(endpointResult.stdout.trim());
      } catch {
        throw new Error('NIM external endpoint is not a valid URL');
      }

      // InferenceService exposes the route root; NIM serves chat completions at this fixed path.
      endpoint.pathname = `${endpoint.pathname.replace(/\/$/, '')}/v1/chat/completions`;
      endpoint.search = '';
      endpoint.hash = '';

      const requestBody = JSON.stringify({
        messages: [{ role: 'user', content: 'What is NVIDIA NIM?' }],
        model: modelId,
        // NVIDIA's API defines this request field with snake case.
        // eslint-disable-next-line camelcase
        max_tokens: 16,
      });
      const responseValidation = [
        '(.choices | type == "array")',
        '((.choices | length) > 0)',
        '(.choices[0].message.content | type == "string")',
        '(.choices[0].message.content | length > 0)',
      ].join(' and ');
      // A 200 response is only successful when it contains a usable assistant message.
      const responseLogFilter =
        '{model: .model, choices: [.choices[] | {finish_reason, content: .message.content}]}';
      const responseFilter = `select(${responseValidation}) | ${responseLogFilter}`;
      // Build one shell command: curl stores the raw body in a temporary file, checks the exact
      // status, and emits only the validated summary. The token never enters Cypress output.
      // Each `|| exit 1` propagates a failed shell stage to Cypress, which fails on nonzero exits.
      const curlCommand = [
        authenticate &&
          `token=$(oc get secret ${tokenSecretName} -n ${namespace} -o jsonpath='{.data.token}' | base64 -d) || exit 1`,
        authenticate && '[ -n "$token" ] || exit 1',
        'response_file=$(mktemp) || exit 1',
        `trap 'rm -f "$response_file"' 0`,
        `http_status=$(curl --silent --show-error --insecure --connect-timeout 20 --max-time 120 ` +
          `--output "$response_file" --write-out '%{http_code}' --request POST ${quoteForShell(
            endpoint.toString(),
          )} ` +
          `--header 'accept: application/json' --header 'content-type: application/json' ` +
          `${
            authenticate ? '--header "Authorization: Bearer $token" ' : ''
          }--data-raw ${quoteForShell(requestBody)}) || exit 1`,
        `[ "$http_status" = "${expectedStatus}" ] || exit 1`,
        authenticate && `jq -ce ${quoteForShell(responseFilter)} "$response_file"`,
      ]
        .filter(Boolean)
        .join('; ');

      cy.log(
        `Send ${
          authenticate ? 'authenticated' : 'unauthenticated'
        } NIM chat-completions request to ${endpoint.toString()}`,
      );
      return cy
        .exec(curlCommand, { log: false, timeout: 120000 })
        .then((curlResult: CommandLineResult) => {
          if (authenticate) {
            cy.task(
              'log',
              `NIM chat-completions response: ${curlResult.stdout.trim() || 'no response body'}`,
            );
          }
          return cy.wrap(curlResult);
        });
    });
};
