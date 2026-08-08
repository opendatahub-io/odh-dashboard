import { WORKSPACE_QUERY_PARAM } from '@odh-dashboard/internal/routes/pipelines/mlflow';

export const mcpCatalogUrl = (): string => '/ai-hub/mcp-servers/catalog';

export const mcpServerDetailsUrl = (serverId: string | number): string =>
  `${mcpCatalogUrl()}/${encodeURIComponent(String(serverId))}`;

export const mcpDeploymentsUrl = (namespace?: string): string =>
  namespace
    ? `/ai-hub/mcp-servers/deployments/${encodeURIComponent(namespace)}`
    : '/ai-hub/mcp-servers/deployments';

export const mcpRegistryServerUrl = (
  serverName: string,
  { version, namespace }: { version?: string; namespace?: string } = {},
): string => {
  const base = `/ai-hub/mcp-servers/registry/${encodeURIComponent(serverName)}`;
  if (!version && !namespace) {
    return base;
  }
  const params = new URLSearchParams();
  if (version) {
    params.set('version', version);
  }
  if (namespace) {
    params.set(WORKSPACE_QUERY_PARAM, namespace);
  }
  return `${base}?${params.toString()}`;
};
