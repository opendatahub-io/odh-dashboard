/** Waits beyond Authorino's default 60-second metadata cache TTL for key revocation. */
export const verifyMaaSApiKeyRevoked = (
  endpoint: string,
  apiKey: string,
  requestBody: { model: string; messages: Array<{ role: string; content: string }> },
  timeoutMs = 75000,
): Cypress.Chainable<void> => {
  const retryIntervalMs = 5000;

  const poll = (deadline: number): Cypress.Chainable<void> => {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new Error(`Revoked MaaS API key did not return HTTP 403 within ${timeoutMs} ms`);
    }

    return cy
      .request({
        method: 'POST',
        url: endpoint,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: requestBody,
        failOnStatusCode: false,
        retryOnNetworkFailure: false,
        timeout: remainingMs,
        log: false,
      })
      .then((response) => {
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
