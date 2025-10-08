/**
 * API request utilities for Gen-AI E2E tests
 * All API calls should go through these utility functions
 */

export interface NamespaceResponse {
  data: Array<{ name: string }>;
}

export interface MCPServersResponse {
  data: {
    total_count: number;
    items?: Array<{
      name: string;
      status: string;
    }>;
  };
}

/**
 * Get list of namespaces from the cluster
 */
export const getNamespaces = (): Cypress.Chainable<Cypress.Response<NamespaceResponse>> => {
  return cy.apiRequest('/gen-ai/api/v1/namespaces') as Cypress.Chainable<
    Cypress.Response<NamespaceResponse>
  >;
};

/**
 * Get MCP servers for a specific namespace
 */
export const getMCPServers = (
  namespace: string,
): Cypress.Chainable<Cypress.Response<MCPServersResponse>> => {
  return cy.apiRequest(`/gen-ai/api/v1/aaa/mcps?namespace=${namespace}`) as Cypress.Chainable<
    Cypress.Response<MCPServersResponse>
  >;
};

/**
 * Verify API response status and throw error if not successful
 */
export const verifyApiResponse = (
  response: Cypress.Response<unknown>,
  expectedStatus = 200,
): void => {
  if (response.status !== expectedStatus) {
    throw new Error(
      `API request failed: Expected ${expectedStatus}, got ${response.status}. ` +
        `Response: ${JSON.stringify(response.body)}`,
    );
  }
};
