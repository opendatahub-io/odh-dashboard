export type MaaSCompletionRequestBody = {
  model: string;
  messages: Array<{ role: string; content: string }>;
};

export const requestMaaSCompletion = (
  endpoint: string,
  apiKey: string,
  requestBody: MaaSCompletionRequestBody,
  timeout?: number,
): Cypress.Chainable<Cypress.Response<unknown>> =>
  cy.request({
    method: 'POST',
    url: endpoint,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: requestBody,
    failOnStatusCode: false,
    retryOnNetworkFailure: false,
    ...(timeout === undefined ? {} : { timeout }),
    log: false,
  });

/** Executes the Portal-provided curl command while accepting the cluster ingress certificate. */
export const executeMaaSUsageExample = (
  usageExample: string,
): Cypress.Chainable<{ status: number; body: string }> => {
  if (!/\bcurl\b/.test(usageExample)) {
    throw new Error('The copied MaaS usage example does not contain a curl command');
  }

  const command = usageExample.replace(
    /\bcurl\b/,
    "curl -k --silent --show-error --write-out '\\n%{http_code}'",
  );

  return cy
    .exec(command, { failOnNonZeroExit: false, log: false, timeout: 120000 })
    .then(({ exitCode, stdout, stderr }) => {
      expect(exitCode, `copied MaaS curl command failed: ${stderr}`).to.equal(0);
      const statusMatch = stdout.match(/\n(\d{3})\s*$/);
      if (!statusMatch) {
        throw new Error('Could not read the HTTP status from the copied MaaS usage example');
      }

      const status = Number(statusMatch[1]);
      const body = stdout.slice(0, statusMatch.index).trim();
      return cy.wrap({ status, body }, { log: false });
    });
};

/** Waits beyond Authorino's default 60-second metadata cache TTL for key revocation. */
export const verifyMaaSApiKeyRevoked = (
  endpoint: string,
  apiKey: string,
  requestBody: MaaSCompletionRequestBody,
  timeoutMs = 75000,
): Cypress.Chainable<void> => {
  const retryIntervalMs = 5000;

  const poll = (deadline: number): Cypress.Chainable<void> => {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new Error(`Revoked MaaS API key did not return HTTP 403 within ${timeoutMs} ms`);
    }

    return requestMaaSCompletion(endpoint, apiKey, requestBody, remainingMs).then((response) => {
      const waitMs = Math.min(retryIntervalMs, deadline - Date.now());
      if (response.status === 200 && waitMs > 0) {
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- bounded polling for Authorino cache expiry
        return cy.wait(waitMs, { log: false }).then(() => poll(deadline));
      }

      expect(response.status, 'revoked MaaS API key response status').to.equal(403);
      return cy.wrap(undefined as void, { log: false });
    });
  };

  // Start the deadline when Cypress executes this step, after earlier commands finish.
  return cy.then(() => poll(Date.now() + timeoutMs));
};
