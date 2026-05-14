import type { PollOptions } from './baseCommands';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

/**
 * Type for OGXServer status response
 */
type OGXServerState = {
  status?: {
    phase?: string;
    conditions?: Array<{
      type: string;
      status: string;
      message?: string;
      reason?: string;
    }>;
  };
  metadata?: {
    name?: string;
  };
};

/**
 * Default polling configuration
 */
const DEFAULT_POLL_OPTIONS: Required<PollOptions> = {
  maxAttempts: 60,
  pollIntervalMs: 5000,
};

/**
 * DSC condition names — older clusters use LlamaStackOperatorReady,
 * newer ones will surface OGXOperatorReady once the DSC is updated.
 */
const DSC_OPERATOR_CONDITIONS = ['LlamaStackOperatorReady', 'OGXOperatorReady'] as const;

/**
 * Wait for the LlamaStack operator to be ready by polling the DataScienceCluster status.
 * Checks for the LlamaStackOperatorReady condition to be True.
 *
 * @param options Polling options (maxAttempts, pollIntervalMs).
 * @returns A Cypress chainable that resolves when the operator is ready.
 */
export const waitForLlamaStackOperatorReady = (
  options: PollOptions = {},
): Cypress.Chainable<CommandLineResult> => {
  const { maxAttempts, pollIntervalMs } = { ...DEFAULT_POLL_OPTIONS, ...options };
  const startTime = Date.now();
  const totalTimeout = maxAttempts * pollIntervalMs;

  const check = (attemptNumber = 1): Cypress.Chainable<CommandLineResult> => {
    const conditionFilter = DSC_OPERATOR_CONDITIONS.map((c) => `@.type=="${c}"`).join(' || ');
    const command = `oc get datasciencecluster default-dsc -o jsonpath='{.status.conditions[?(${conditionFilter})].status}'`;

    return cy.exec(command, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
      const raw = result.stdout.trim();
      const isReady = raw.split(/\s+/).includes('True');
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      if (isReady) {
        cy.log(`✅ LlamaStackOperatorReady condition is True (after ${elapsedTime}s)`);
        return cy.wrap(result);
      }

      if (attemptNumber >= maxAttempts) {
        throw new Error(
          `LlamaStackOperatorReady condition not True after ${maxAttempts} attempts (${elapsedTime}s). Current status: ${
            raw || 'not found'
          }`,
        );
      }

      cy.log(
        `⏳ Waiting for LlamaStackOperatorReady (attempt ${attemptNumber}/${maxAttempts}, status: ${
          raw || 'not found'
        }, elapsed: ${elapsedTime}s)`,
      );
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
    });
  };

  cy.step(`Polling for LlamaStackOperatorReady condition (max ${totalTimeout / 1000}s)`);
  return check();
};

/**
 * Wait for an OGXServer to be Ready in the specified namespace.
 * Polls until the phase is "Ready" or max attempts is reached.
 *
 * @param namespace The namespace where the OGXServer is deployed.
 * @param options Polling options (maxAttempts, pollIntervalMs).
 * @returns A Cypress chainable that resolves when the server is ready.
 */
export const waitForOGXServerReady = (
  namespace: string,
  options: PollOptions = {},
): Cypress.Chainable<CommandLineResult> => {
  const { maxAttempts, pollIntervalMs } = { ...DEFAULT_POLL_OPTIONS, ...options };
  const startTime = Date.now();
  const totalTimeout = maxAttempts * pollIntervalMs;

  const check = (attemptNumber = 1): Cypress.Chainable<CommandLineResult> => {
    const command = `oc get ogxservers -n ${namespace} -o json`;

    return cy.exec(command, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      if (result.exitCode !== 0) {
        const maskedStderr = maskSensitiveInfo(result.stderr);
        throw new Error(`Command failed with exit code ${result.exitCode}: ${maskedStderr}`);
      }

      if (!result.stdout.trim()) {
        throw new Error('Command succeeded but returned empty output');
      }

      let ogxList: { items: OGXServerState[] };
      try {
        ogxList = JSON.parse(result.stdout) as { items: OGXServerState[] };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown parsing error';
        throw new Error(`Failed to parse OGXServer JSON: ${errorMsg}`);
      }

      if (ogxList.items.length === 0) {
        if (attemptNumber >= maxAttempts) {
          throw new Error(
            `No OGXServer found in namespace ${namespace} after ${attemptNumber} attempts`,
          );
        }
        cy.log(`No OGXServer found yet (attempt ${attemptNumber}/${maxAttempts})`);
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        return cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
      }

      const ogxServer = ogxList.items[0];
      const phase = ogxServer.status?.phase ?? 'Unknown';
      const name = ogxServer.metadata?.name ?? 'unknown';

      if (phase === 'Ready') {
        cy.log(`OGXServer ${name} is Ready in namespace ${namespace} (after ${elapsedTime}s)`);
        return cy.wrap(result);
      }

      if (phase === 'Failed') {
        const conditions = ogxServer.status?.conditions ?? [];
        const errorDetails = conditions
          .map(
            (c) =>
              `${c.type}: ${c.status}${c.message ? ` - ${c.message}` : ''}${
                c.reason ? ` (${c.reason})` : ''
              }`,
          )
          .join('\n');

        throw new Error(
          `OGXServer ${name} failed in namespace ${namespace}\nPhase: Failed\n${
            errorDetails || 'No condition details available'
          }`,
        );
      }

      if (attemptNumber >= maxAttempts) {
        throw new Error(
          `OGXServer ${name} did not become Ready within ${
            totalTimeout / 1000
          }s. Current phase: ${phase}`,
        );
      }

      cy.log(
        `OGXServer ${name} phase: "${phase}" (attempt ${attemptNumber}/${maxAttempts}, elapsed: ${elapsedTime}s)`,
      );
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
    });
  };

  cy.step(`Polling for OGXServer Ready in namespace ${namespace} (max ${totalTimeout / 1000}s)`);
  return check();
};

/**
 * @deprecated Use waitForOGXServerReady instead
 */
export const checkLlamaStackDistributionReady = waitForOGXServerReady;
