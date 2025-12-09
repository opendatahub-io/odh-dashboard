import type { PollOptions } from './baseCommands';
import type { CommandLineResult } from '../../types';

/**
 * Type for LlamaStackDistribution status response
 */
type LlamaStackDistributionState = {
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
    const command = `oc get datasciencecluster default-dsc -o jsonpath='{.status.conditions[?(@.type=="LlamaStackOperatorReady")].status}'`;

    return cy.exec(command, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
      const status = result.stdout.trim();
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      if (status === 'True') {
        cy.log(`✅ LlamaStackOperatorReady condition is True (after ${elapsedTime}s)`);
        return cy.wrap(result);
      }

      if (attemptNumber >= maxAttempts) {
        throw new Error(
          `LlamaStackOperatorReady condition not True after ${maxAttempts} attempts (${elapsedTime}s). Current status: ${
            status || 'not found'
          }`,
        );
      }

      cy.log(
        `⏳ Waiting for LlamaStackOperatorReady (attempt ${attemptNumber}/${maxAttempts}, status: ${
          status || 'not found'
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
 * Wait for a LlamaStackDistribution to be Ready in the specified namespace.
 * Polls until the phase is "Ready" or max attempts is reached.
 *
 * @param namespace The namespace where the LlamaStackDistribution is deployed.
 * @param options Polling options (maxAttempts, pollIntervalMs).
 * @returns A Cypress chainable that resolves when the distribution is ready.
 */
export const waitForLlamaStackDistributionReady = (
  namespace: string,
  options: PollOptions = {},
): Cypress.Chainable<CommandLineResult> => {
  const { maxAttempts, pollIntervalMs } = { ...DEFAULT_POLL_OPTIONS, ...options };
  const startTime = Date.now();
  const totalTimeout = maxAttempts * pollIntervalMs;

  const check = (attemptNumber = 1): Cypress.Chainable<CommandLineResult> => {
    const command = `oc get llamastackdistributions -n ${namespace} -o json`;

    return cy.exec(command, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      // Handle command failure
      if (result.code !== 0) {
        throw new Error(`Command failed with exit code ${result.code}: ${result.stderr}`);
      }

      // Handle empty output
      if (!result.stdout.trim()) {
        throw new Error('Command succeeded but returned empty output');
      }

      // Parse JSON response
      let lsdList: { items: LlamaStackDistributionState[] };
      try {
        lsdList = JSON.parse(result.stdout) as { items: LlamaStackDistributionState[] };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown parsing error';
        throw new Error(`Failed to parse LlamaStackDistribution JSON: ${errorMsg}`);
      }

      // Handle no resources found
      if (lsdList.items.length === 0) {
        if (attemptNumber >= maxAttempts) {
          throw new Error(
            `No LlamaStackDistribution found in namespace ${namespace} after ${attemptNumber} attempts`,
          );
        }
        cy.log(`⏳ No LlamaStackDistribution found yet (attempt ${attemptNumber}/${maxAttempts})`);
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        return cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
      }

      // Check first LlamaStackDistribution (assuming one per namespace)
      const lsd = lsdList.items[0];
      const phase = lsd.status?.phase ?? 'Unknown';
      const name = lsd.metadata?.name ?? 'unknown';

      // Success case
      if (phase === 'Ready') {
        cy.log(
          `✅ LlamaStackDistribution ${name} is Ready in namespace ${namespace} (after ${elapsedTime}s)`,
        );
        return cy.wrap(result);
      }

      // Failure case
      if (phase === 'Failed') {
        const conditions = lsd.status?.conditions ?? [];
        const errorDetails = conditions
          .map(
            (c) =>
              `${c.type}: ${c.status}${c.message ? ` - ${c.message}` : ''}${
                c.reason ? ` (${c.reason})` : ''
              }`,
          )
          .join('\n');

        throw new Error(
          `LlamaStackDistribution ${name} failed in namespace ${namespace}\nPhase: Failed\n${
            errorDetails || 'No condition details available'
          }`,
        );
      }

      // Timeout case
      if (attemptNumber >= maxAttempts) {
        throw new Error(
          `LlamaStackDistribution ${name} did not become Ready within ${
            totalTimeout / 1000
          }s. Current phase: ${phase}`,
        );
      }

      // Continue polling
      cy.log(
        `⏳ LlamaStackDistribution ${name} phase: "${phase}" (attempt ${attemptNumber}/${maxAttempts}, elapsed: ${elapsedTime}s)`,
      );
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
    });
  };

  cy.step(
    `Polling for LlamaStackDistribution Ready in namespace ${namespace} (max ${
      totalTimeout / 1000
    }s)`,
  );
  return check();
};

/**
 * @deprecated Use waitForLlamaStackDistributionReady instead
 */
export const checkLlamaStackDistributionReady = waitForLlamaStackDistributionReady;
