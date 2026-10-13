import type { PollOptions } from './oc_commands/baseCommands';

type ResponsesAPIContent = {
  text?: string;
  type?: string;
};

type ResponsesAPIOutput = {
  content?: ResponsesAPIContent[];
  role?: string;
  type?: string;
};

type ResponsesAPIResponse = {
  output?: ResponsesAPIOutput[];
  status?: string;
};

type AgentDeploymentSummary = {
  displayName?: string;
  lastError?: string;
  name: string;
  routeUrl?: string;
  state?: 'creating' | 'failed' | 'ready';
};

type ReadyAgentDeployment = {
  name: string;
  routeUrl: string;
};

type AgentDeploymentListResponse = {
  data?: {
    deployments?: AgentDeploymentSummary[];
  };
};

const DEFAULT_POLL_OPTIONS: Required<PollOptions> = {
  maxAttempts: 60,
  pollIntervalMs: 5000,
};

const RESPONSES_API_MAX_ATTEMPTS = 24;
const RESPONSES_API_POLL_INTERVAL_MS = 5000;

/** Poll the Gen AI BFF until the deployment is ready and has a public Route URL. */
export const waitForAgentDeploymentReady = (
  namespace: string,
  deploymentDisplayName: string,
  options: PollOptions = {},
): Cypress.Chainable<ReadyAgentDeployment> => {
  const { maxAttempts, pollIntervalMs } = { ...DEFAULT_POLL_OPTIONS, ...options };
  const totalTimeout = maxAttempts * pollIntervalMs;
  const startTime = Date.now();
  const endpoint = `/gen-ai/api/v1/agent-deployments?namespace=${encodeURIComponent(namespace)}`;

  const poll = (attempt = 1): Cypress.Chainable<ReadyAgentDeployment> =>
    cy
      .request({
        method: 'GET',
        url: endpoint,
        failOnStatusCode: false,
        log: false,
      })
      .then((response) => {
        const body = response.body as AgentDeploymentListResponse;
        const deployments = body.data?.deployments ?? [];
        const deployment = deployments.find((item) => item.displayName === deploymentDisplayName);
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

        if (response.status === 200 && deployment?.state === 'ready' && deployment.routeUrl) {
          cy.log(
            `Agent deployment ${deploymentDisplayName} is ready after ${elapsedTime}s (${attempt} status checks)`,
          );
          return cy.wrap({ name: deployment.name, routeUrl: deployment.routeUrl }, { log: false });
        }

        if (deployment?.state === 'failed') {
          throw new Error(
            `Agent deployment ${deploymentDisplayName} failed: ${
              deployment.lastError ?? 'unknown error'
            }`,
          );
        }

        if (attempt >= maxAttempts) {
          throw new Error(
            `Agent deployment ${deploymentDisplayName} did not become ready within ${
              totalTimeout / 1000
            }s (last BFF status: ${response.status}, state: ${deployment?.state ?? 'unknown'})`,
          );
        }

        cy.log(
          `Waiting for agent deployment ${deploymentDisplayName} (attempt ${attempt}/${maxAttempts}, BFF status: ${
            response.status
          }, state: ${deployment?.state ?? 'unknown'}, elapsed: ${elapsedTime}s)`,
        );
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        return cy.wait(pollIntervalMs).then(() => poll(attempt + 1));
      });

  cy.step(
    `Polling BFF for agent deployment ${deploymentDisplayName} (max ${totalTimeout / 1000}s)`,
  );
  return poll();
};

/** Send a non-streaming request to a deployed agent's OpenAI Responses API endpoint. */
export const verifyAgentDeploymentResponsesAPI = (
  endpoint: string,
  input: string,
): Cypress.Chainable<void> =>
  cy.exec('oc whoami -t', { failOnNonZeroExit: false, log: false }).then((tokenResult) => {
    const token = tokenResult.stdout.trim();
    if (!token) {
      throw new Error(`Failed to get OC token: ${tokenResult.stderr}`);
    }

    const requestResponse = (attempt = 1): Cypress.Chainable<void> =>
      cy
        .request({
          method: 'POST',
          url: endpoint,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: { input },
          failOnStatusCode: false,
          log: false,
          timeout: 120000,
        })
        .then((response) => {
          if (response.status === 503 && attempt < RESPONSES_API_MAX_ATTEMPTS) {
            cy.log(
              `Responses API is not ready (attempt ${attempt}/${RESPONSES_API_MAX_ATTEMPTS}); retrying in ${
                RESPONSES_API_POLL_INTERVAL_MS / 1000
              }s`,
            );
            // eslint-disable-next-line cypress/no-unnecessary-waiting
            return cy.wait(RESPONSES_API_POLL_INTERVAL_MS).then(() => requestResponse(attempt + 1));
          }

          expect(response.status, 'Responses API status').to.equal(200);

          const body = response.body as ResponsesAPIResponse;
          expect(body.status, 'Responses API completion status').to.equal('completed');

          const assistantResponse = body.output?.find(
            (output) => output.type === 'message' && output.role === 'assistant',
          );
          const outputText = assistantResponse?.content?.find(
            (content) => content.type === 'output_text' && Boolean(content.text?.trim()),
          )?.text;
          expect(outputText, 'Responses API assistant output').to.be.a('string');
          expect(
            outputText?.trim().length,
            'Responses API assistant output length',
          ).to.be.greaterThan(0);
        });

    cy.step(
      `Polling the deployed agent Responses API (max ${
        (RESPONSES_API_MAX_ATTEMPTS * RESPONSES_API_POLL_INTERVAL_MS) / 1000
      }s)`,
    );
    return requestResponse();
  });
