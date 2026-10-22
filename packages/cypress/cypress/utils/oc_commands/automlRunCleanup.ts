const TERMINAL_STATES = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'SKIPPED', 'CACHED']);
const TERMINATABLE_STATES = new Set(['PENDING', 'RUNNING', 'PAUSED']);
const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 24;

/** Ask the in-namespace KFP API to stop a run, then wait until it cannot write more S3 output. */
export const settleAutomlRun = (namespace: string, runId: string): Cypress.Chainable<boolean> => {
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(namespace) || !/^[A-Za-z0-9-]+$/.test(runId)) {
    throw new Error('Invalid namespace or run ID for AutoML cleanup');
  }

  const url = `https://localhost:8888/apis/v2beta1/runs/${runId}`;
  const command = `oc exec deploy/ds-pipeline-dspa -n ${namespace} -c ds-pipeline-api-server -- curl -ksSf --max-time 15 ${url}`;
  const getState = (): Cypress.Chainable<string | null> =>
    cy
      .exec(command, { failOnNonZeroExit: false, log: false, timeout: 30000 })
      .then((result): Cypress.Chainable<string | null> => {
        if (result.exitCode !== 0) {
          return cy
            .log(`Could not read KFP run ${runId} in ${namespace}: ${result.stderr}`)
            .then(() => cy.wrap<string | null>(null));
        }
        try {
          const response = JSON.parse(result.stdout) as { state?: string };
          return cy.wrap(response.state ?? null);
        } catch {
          return cy.wrap<string | null>(null);
        }
      });

  const waitForTerminal = (attempt: number): Cypress.Chainable<boolean> =>
    getState().then((state): Cypress.Chainable<boolean> => {
      if (state && TERMINAL_STATES.has(state)) {
        return cy.wrap(true);
      }
      if (!state || attempt >= MAX_POLLS) {
        cy.log(
          `KFP run ${runId} did not reach a terminal state (last state: ${state ?? 'unknown'})`,
        );
        return cy.wrap(false);
      }
      // State-based polling, not a delay between unrelated test steps.
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(POLL_INTERVAL_MS).then(() => waitForTerminal(attempt + 1));
    });

  return getState().then((state): Cypress.Chainable<boolean> => {
    if (state && TERMINAL_STATES.has(state)) {
      return cy.wrap(true);
    }
    if (!state) {
      return cy.wrap(false);
    }
    if (!TERMINATABLE_STATES.has(state)) {
      return waitForTerminal(1);
    }
    return cy
      .exec(
        `oc exec deploy/ds-pipeline-dspa -n ${namespace} -c ds-pipeline-api-server -- curl -ksSf --max-time 15 -X POST ${url}:terminate`,
        { failOnNonZeroExit: false, log: false, timeout: 30000 },
      )
      .then((result): Cypress.Chainable<boolean> => {
        if (result.exitCode !== 0) {
          cy.log(`Could not terminate KFP run ${runId} in ${namespace}: ${result.stderr}`);
          return cy.wrap(false);
        }
        return waitForTerminal(1);
      });
  });
};
