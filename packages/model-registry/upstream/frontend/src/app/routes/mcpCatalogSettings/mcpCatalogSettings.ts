export const MCP_CATALOG_SETTINGS_PAGE_TITLE = 'MCP catalog sources';
export const MCP_CATALOG_SETTINGS_DESCRIPTION =
  'Add and manage sources that populate the MCP catalog for users in your organization. Each source is a YAML file that can contain multiple servers.';

export const MCP_ADD_SOURCE_TITLE = 'Add source';
export const MCP_ADD_SOURCE_DESCRIPTION = 'Add a new MCP catalog source to your organization.';

export const MCP_MANAGE_SOURCE_TITLE = 'Manage source';
export const MCP_MANAGE_SOURCE_DESCRIPTION =
  'Configure which servers from this source appear in the MCP catalog.';

export const mcpCatalogSettingsUrl = (): string => '/settings/mcp-resources/mcp-catalog';

export const mcpAddSourceUrl = (): string => `${mcpCatalogSettingsUrl()}/add-source`;

export const mcpManageSourceUrl = (catalogSourceId: string): string =>
  `${mcpCatalogSettingsUrl()}/manage-source/${encodeURIComponent(catalogSourceId)}`;
