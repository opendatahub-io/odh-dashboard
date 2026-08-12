import { WORKSPACE_QUERY_PARAM } from '@odh-dashboard/internal/routes/pipelines/mlflow';

const BFF_API_VERSION = 'v1';
const MLFLOW_BFF_PATH = `/_bff/mlflow/api/${BFF_API_VERSION}`;
const DEFAULT_MCP_PATH = '/mcp'; // Fallback for optional spec.config.path

export const MCP_REGISTRY_BASENAME = '/ai-hub/mcp-servers/registry';

export const mcpRegistryBaseRoute = (namespace?: string): string => {
  if (!namespace) {
    return MCP_REGISTRY_BASENAME;
  }
  return `${MCP_REGISTRY_BASENAME}?${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(namespace)}`;
};

export const mcpServerDetailRoute = (serverName: string, namespace?: string): string => {
  const basePath = `${MCP_REGISTRY_BASENAME}/${encodeURIComponent(serverName)}`;
  if (!namespace) {
    return basePath;
  }
  return `${basePath}?${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(namespace)}`;
};

export { MLFLOW_BFF_PATH, DEFAULT_MCP_PATH };
