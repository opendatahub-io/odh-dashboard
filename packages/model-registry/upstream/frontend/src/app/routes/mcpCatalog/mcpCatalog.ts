export const mcpCatalogUrl = (): string => '/ai-hub/mcp-catalog';

export const mcpServerDetailsUrl = (serverId: string | number): string =>
  `${mcpCatalogUrl()}/${encodeURIComponent(String(serverId))}`;
