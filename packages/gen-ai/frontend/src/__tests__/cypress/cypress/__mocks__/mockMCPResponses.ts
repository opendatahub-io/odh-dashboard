/* eslint-disable camelcase */

/**
 * Mock MCP API Response Helpers
 * Provides reusable interceptors for MCP server status and tools endpoints
 */

// Import fixtures as static data to avoid promise conflicts in interceptors
import mcpStatusConnected from '~/__tests__/cypress/cypress/fixtures/mocked/mcpServers/mcpStatusConnected.json';
import mcpStatusError401 from '~/__tests__/cypress/cypress/fixtures/mocked/mcpServers/mcpStatusError401.json';
import mcpStatusError400 from '~/__tests__/cypress/cypress/fixtures/mocked/mcpServers/mcpStatusError400.json';
import mcpToolsSuccess from '~/__tests__/cypress/cypress/fixtures/mocked/mcpServers/mcpToolsSuccess.json';
import mcpToolsUnauthorized from '~/__tests__/cypress/cypress/fixtures/mocked/mcpServers/mcpToolsUnauthorized.json';
import mcpStatusKubernetesConnected from '~/__tests__/cypress/cypress/fixtures/mocked/mcpServers/mcpStatusKubernetesConnected.json';
import mcpToolsKubernetes from '~/__tests__/cypress/cypress/fixtures/mocked/mcpServers/mcpToolsKubernetes.json';

/**
 * Mock MCP status endpoint with token validation
 * Returns connected status for valid tokens, error for invalid/missing tokens
 *
 * @param testToken - Valid token to check against
 * @param serverUrl - MCP server URL to include in response
 * @returns Cypress chainable for the intercept
 */
export const mockMCPStatusInterceptor = (
  testToken: string,
  serverUrl: string,
): Cypress.Chainable<null> => {
  const encodedServerUrl = encodeURIComponent(serverUrl);

  return cy
    .intercept('GET', `**/mcp/status*server_url=${encodedServerUrl}*`, (req) => {
      const authHeader = req.headers['x-mcp-bearer'] || req.headers['X-MCP-Bearer'];

      if (authHeader && authHeader.includes(testToken)) {
        // Valid token - return connected status
        const response = JSON.parse(JSON.stringify(mcpStatusConnected));
        response.data.server_url = serverUrl;
        req.reply({ statusCode: 200, body: response });
      } else {
        // Invalid/missing token - return unauthorized error
        const response = JSON.parse(JSON.stringify(mcpStatusError401));
        response.data.server_url = serverUrl;
        req.reply({ statusCode: 200, body: response });
      }
    })
    .as('statusCheck');
};

/**
 * Mock MCP status endpoint to return specific error type
 * Used for testing error handling scenarios
 *
 * @param errorType - Type of error: '400' or '401'
 * @param serverUrl - MCP server URL to include in response
 * @returns Cypress chainable for the intercept
 */
export const mockMCPStatusError = (
  errorType: '400' | '401',
  serverUrl: string,
): Cypress.Chainable<null> => {
  const fixtureData = errorType === '400' ? mcpStatusError400 : mcpStatusError401;
  const encodedServerUrl = encodeURIComponent(serverUrl);

  return cy
    .intercept('GET', `**/mcp/status*server_url=${encodedServerUrl}*`, (req) => {
      const response = JSON.parse(JSON.stringify(fixtureData));
      response.data.server_url = serverUrl;
      req.reply({ statusCode: 200, body: response });
    })
    .as('statusCheckError');
};

/**
 * Mock MCP tools endpoint with token validation
 * Returns tools list for valid tokens, 401 error for invalid/missing tokens
 *
 * @param testToken - Valid token to check against
 * @param serverUrl - MCP server URL to include in response
 * @returns Cypress chainable for the intercept
 */
export const mockMCPToolsInterceptor = (
  testToken: string,
  serverUrl: string,
): Cypress.Chainable<null> => {
  const encodedServerUrl = encodeURIComponent(serverUrl);

  return cy
    .intercept('GET', `**/mcp/tools*server_url=${encodedServerUrl}*`, (req) => {
      const authHeader = req.headers['x-mcp-bearer'] || req.headers['X-MCP-Bearer'];

      if (authHeader && authHeader.includes(testToken)) {
        // Valid token - return tools list
        const response = JSON.parse(JSON.stringify(mcpToolsSuccess));
        response.data.server_url = serverUrl;
        req.reply({ statusCode: 200, body: response });
      } else {
        // Invalid/missing token - return unauthorized error
        const response = JSON.parse(JSON.stringify(mcpToolsUnauthorized));
        req.reply({ statusCode: 401, body: response });
      }
    })
    .as('toolsRequest');
};

/**
 * Mock MCP status endpoint for auto-connectable servers (no token required)
 * Returns connected status without requiring authentication
 *
 * @param serverUrl - MCP server URL to include in response
 * @returns Cypress chainable for the intercept
 */
export const mockMCPStatusAutoConnect = (serverUrl: string): Cypress.Chainable<null> => {
  // Encode the server URL to match how it appears in the query string
  const encodedServerUrl = encodeURIComponent(serverUrl);

  return cy
    .intercept('GET', `**/mcp/status*server_url=${encodedServerUrl}*`, (req) => {
      const response = JSON.parse(JSON.stringify(mcpStatusKubernetesConnected));
      response.data.server_url = serverUrl;
      req.reply({ statusCode: 200, body: response });
    })
    .as('statusCheckAutoConnect');
};

/**
 * Mock MCP tools endpoint for auto-connectable servers
 * Returns tools list without requiring authentication
 *
 * @param serverUrl - MCP server URL to include in response
 * @returns Cypress chainable for the intercept
 */
export const mockMCPToolsAutoConnect = (serverUrl: string): Cypress.Chainable<null> => {
  // Encode the server URL to match how it appears in the query string
  const encodedServerUrl = encodeURIComponent(serverUrl);

  return cy
    .intercept('GET', `**/mcp/tools*server_url=${encodedServerUrl}*`, (req) => {
      const response = JSON.parse(JSON.stringify(mcpToolsKubernetes));
      response.data.server_url = serverUrl;
      req.reply({ statusCode: 200, body: response });
    })
    .as('toolsRequestAutoConnect');
};
