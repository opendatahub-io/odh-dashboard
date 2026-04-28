export const mcpCatalogUrl = (): string => '/ai-hub/mcp-servers/catalog';

export const mcpServerDetailsUrl = (serverId: string | number): string =>
  `${mcpCatalogUrl()}/${encodeURIComponent(String(serverId))}`;

export const mcpDeploymentsUrl = (namespace?: string): string =>
  namespace
    ? `/ai-hub/mcp-deployments?namespace=${encodeURIComponent(namespace)}`
    : '/ai-hub/mcp-deployments';
