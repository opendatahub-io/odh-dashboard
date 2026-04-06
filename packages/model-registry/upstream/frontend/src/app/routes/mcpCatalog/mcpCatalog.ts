export const mcpCatalogUrl = (): string => '/ai-hub/mcp-servers/catalog';

export const mcpServerDetailsUrl = (serverId: string | number): string =>
  `${mcpCatalogUrl()}/${encodeURIComponent(String(serverId))}`;

export const mcpDeploymentsUrl = (): string => '/ai-hub/mcp-deployments';
