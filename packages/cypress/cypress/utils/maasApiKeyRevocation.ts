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

type ParsedMaaSUsageExample = {
  endpoint: string;
  apiKey: string;
  requestBody: MaaSCompletionRequestBody;
};

const decodeDoubleQuotedShellValue = (value: string): string => {
  let decoded = '';
  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    if (character !== '\\') {
      decoded += character;
      continue;
    }

    const escapedCharacter = value[index + 1];
    if (!escapedCharacter || !['\\', '"', '$', '`'].includes(escapedCharacter)) {
      throw new Error('The copied MaaS usage example contains an invalid API key escape');
    }
    decoded += escapedCharacter;
    index++;
  }
  return decoded;
};

/** Strictly parses the Portal-generated curl example without evaluating shell content. */
export const parseMaaSUsageExample = (usageExample: string): ParsedMaaSUsageExample => {
  const lines = usageExample
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length !== 5) {
    throw new Error('The copied MaaS usage example has an unexpected command structure');
  }

  const [exportLine, curlLine, contentTypeLine, authorizationLine, dataLine] = lines;
  const apiKeyMatch = /^export API_KEY="((?:\\.|[^"\\])*)"$/.exec(exportLine);
  const endpointMatch = /^curl -X POST (\S+) \\$/.exec(curlLine);

  if (!apiKeyMatch || !endpointMatch) {
    throw new Error('Could not parse the API key or endpoint from the MaaS usage example');
  }
  if (contentTypeLine !== '-H "Content-Type: application/json" \\') {
    throw new Error('The copied MaaS usage example has an unexpected content type header');
  }
  if (authorizationLine !== '-H "Authorization: Bearer $API_KEY" \\') {
    throw new Error('The copied MaaS usage example has an unexpected authorization header');
  }

  const requestBodyMatch = /^-d '(.*)'$/.exec(dataLine);
  if (!requestBodyMatch) {
    throw new Error('Could not parse the request body from the MaaS usage example');
  }

  let endpoint: URL;
  try {
    endpoint = new URL(endpointMatch[1]);
  } catch {
    throw new Error('The copied MaaS usage example contains an invalid endpoint URL');
  }
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) {
    throw new Error('The copied MaaS usage example contains an unsupported endpoint URL');
  }

  let requestBody: MaaSCompletionRequestBody;
  try {
    const shellDecodedBody = requestBodyMatch[1].replaceAll(`'"'"'`, `'`);
    requestBody = JSON.parse(shellDecodedBody) as MaaSCompletionRequestBody;
  } catch {
    throw new Error('The copied MaaS usage example contains an invalid JSON request body');
  }
  if (
    typeof requestBody.model !== 'string' ||
    !requestBody.model ||
    !Array.isArray(requestBody.messages) ||
    !requestBody.messages.length ||
    requestBody.messages.some(
      (message) => typeof message.role !== 'string' || typeof message.content !== 'string',
    )
  ) {
    throw new Error('The copied MaaS usage example contains an unsupported request body');
  }

  return {
    endpoint: endpoint.toString(),
    apiKey: decodeDoubleQuotedShellValue(apiKeyMatch[1]),
    requestBody,
  };
};

/** Sends the Portal-provided usage example without executing its shell command. */
export const executeMaaSUsageExample = (
  usageExample: string,
): Cypress.Chainable<{ status: number; body: string }> => {
  const { endpoint, apiKey, requestBody } = parseMaaSUsageExample(usageExample);
  const requestOptions: Partial<Cypress.RequestOptions> & { strictSSL: boolean } = {
    method: 'POST',
    url: endpoint,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: requestBody,
    failOnStatusCode: false,
    retryOnNetworkFailure: false,
    strictSSL: false,
    timeout: 120000,
    log: false,
  };

  return cy.request(requestOptions).then((response) =>
    cy.wrap(
      {
        status: response.status,
        body: typeof response.body === 'string' ? response.body : JSON.stringify(response.body),
      },
      { log: false },
    ),
  );
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
