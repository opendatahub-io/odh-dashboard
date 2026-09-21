export const REGISTER_BUTTON_TOOLTIP = {
  LOADING_SERVER: 'Loading MCP server details...',
  UNABLE_TO_LOAD_SERVER: 'Unable to load MCP server details',
  LOADING_CATALOG: 'Loading catalog configuration...',
  NAMESPACE_NOT_CONFIGURED: 'MCP catalog namespace is not configured',
  CHECKING_MLFLOW: 'Checking MLflow availability...',
  MLFLOW_UNREACHABLE: 'MLflow service could not be reached',
  MLFLOW_UNAVAILABLE: 'MLflow is not available on this cluster',
  LOADING_DEPLOY_CONFIG: 'Loading deploy configuration...',
} as const;

export const REGISTER_NOTIFICATION = {
  success: (registryName: string, version: string): string =>
    `Registered as ${registryName} v${version}`,
  METADATA_NOT_SAVED: 'Display name and icons were not saved',
  TAGS_NOT_SAVED: 'Some tags were not saved',
} as const;

export const REGISTER_TOOLS_LOAD_WARNING = {
  TITLE: 'Catalog tools could not be loaded',
  description: (detail: string): string =>
    `${detail} You can still register this server without its catalog tools.`,
} as const;

export const MCP_SERVER_JSON_ERROR = {
  INVALID_JSON: 'Enter valid JSON',
  MISSING_NAME: 'server.json must include a name in "<namespace>/<slug>" format',
  INVALID_NAME: 'Name must be in "<namespace>/<slug>" format (for example, com.example/my-server)',
  MISSING_VERSION: 'server.json must include a version',
} as const;

export const MCP_REGISTRY_BASENAME = '/ai-hub/mcp-servers/registry';

/** Registry tag key copied from the catalog server's `source_id`. */
export const CATALOG_SOURCE_ID_TAG_KEY = 'catalog.source.id';
