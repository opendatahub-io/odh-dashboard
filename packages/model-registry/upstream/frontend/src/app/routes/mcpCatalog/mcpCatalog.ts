export const mcpCatalogUrl = (): string => '/ai-hub/mcp-servers/catalog';

export const mcpServerDetailsUrl = (serverId: string | number): string =>
  `${mcpCatalogUrl()}/${encodeURIComponent(String(serverId))}`;

export const mcpDeploymentsUrl = (namespace?: string): string =>
  namespace
    ? `/ai-hub/mcp-servers/deployments/${encodeURIComponent(namespace)}`
    : '/ai-hub/mcp-servers/deployments';

// Mirrors the MCP Registry's route shape (packages/mlflow-embedded/mcp-registry/const.ts).
export const mcpRegistryUrl = (): string => '/ai-hub/mcp-servers/registry';

/** Links to an MCP Registry server's detail page, optionally deep-linking to a
 * specific version via the `version` query param. */
export const mcpRegistryServerDetailUrl = (
  serverName: string,
  namespace?: string,
  version?: string,
): string => {
  const basePath = `${mcpRegistryUrl()}/${encodeURIComponent(serverName)}`;
  const params = new URLSearchParams();
  if (namespace) {
    params.set('workspace', namespace);
  }
  if (version) {
    params.set('version', version);
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
};
