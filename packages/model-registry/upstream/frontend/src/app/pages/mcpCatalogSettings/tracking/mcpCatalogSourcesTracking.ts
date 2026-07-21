import { McpCatalogSourceConfig } from '~/app/mcpServerCatalogTypes';
import { ManageMcpSourceFormData } from '~/app/pages/mcpCatalogSettings/useManageMcpSourceData';

/** Event names for MCP Catalog Sources admin settings (RHOAIUX-2770). */
export const MCP_CATALOG_SOURCES_EVENTS = {
  SETTINGS_VIEWED: 'MCP Catalog Sources Settings Viewed',
  ADD_SOURCE_SELECTED: 'MCP Catalog Sources Add Source Selected',
  SOURCE_ADDED: 'MCP Catalog Sources Source Added',
  SOURCE_ENABLE_TOGGLED: 'MCP Catalog Sources Source Enable Toggled',
  MANAGE_SOURCE_SELECTED: 'MCP Catalog Sources Manage Source Selected',
  SOURCE_UPDATED: 'MCP Catalog Sources Source Updated',
  SOURCE_DELETED: 'MCP Catalog Sources Source Deleted',
  PREVIEW_COMPLETED: 'MCP Catalog Sources Preview Completed',
  PREVIEW_SELECTED: 'MCP Catalog Sources Preview Selected',
  YAML_FORMAT_DRAWER_OPENED: 'MCP Catalog Sources Yaml Format Drawer Opened',
} as const;

export type McpTrackingSourceType = 'preloaded' | 'custom';
export type McpPreloadedTier = 'red_hat_validated' | 'partner' | 'community';
export type McpTrackingFormContext = 'add_source' | 'manage_source';
export type McpServerVisibilityType = 'all' | 'filtered';
export type McpModifiedField = 'name' | 'yaml' | 'visibility' | 'enabled';

export const getMcpTrackingSourceType = (config: { isDefault?: boolean }): McpTrackingSourceType =>
  config.isDefault ? 'preloaded' : 'custom';

/**
 * Best-effort tier from path/labels. Returns undefined when unknown or custom
 * (Segment properties omit undefined; do not send source name / YAML content).
 */
export const getMcpPreloadedTier = (config: {
  isDefault?: boolean;
  yamlCatalogPath?: string;
  labels?: string[];
}): McpPreloadedTier | undefined => {
  if (!config.isDefault) {
    return undefined;
  }

  const haystack = [config.yamlCatalogPath, ...(config.labels ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    haystack.includes('red_hat_validated') ||
    haystack.includes('redhat-validated') ||
    haystack.includes('redhat')
  ) {
    return 'red_hat_validated';
  }
  if (haystack.includes('partner')) {
    return 'partner';
  }
  if (haystack.includes('community')) {
    return 'community';
  }
  return undefined;
};

export const getMcpServerVisibilityType = (
  includedServers: string[] | undefined,
  excludedServers: string[] | undefined,
): McpServerVisibilityType =>
  (includedServers?.length ?? 0) > 0 || (excludedServers?.length ?? 0) > 0 ? 'filtered' : 'all';

const parseServerList = (servers: string): string[] =>
  servers
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const getMcpServerVisibilityTypeFromForm = (
  formData: Pick<ManageMcpSourceFormData, 'includedServers' | 'excludedServers'>,
): McpServerVisibilityType =>
  getMcpServerVisibilityType(
    parseServerList(formData.includedServers),
    parseServerList(formData.excludedServers),
  );

export const hasMcpVisibilityFilters = (
  formData: Pick<ManageMcpSourceFormData, 'includedServers' | 'excludedServers'>,
): boolean => getMcpServerVisibilityTypeFromForm(formData) === 'filtered';

export const getMcpFieldsModified = (
  formData: ManageMcpSourceFormData,
  existingData: Partial<ManageMcpSourceFormData> | undefined,
): McpModifiedField[] => {
  if (!existingData) {
    return [];
  }

  const modified: McpModifiedField[] = [];

  if ((existingData.name ?? '') !== formData.name) {
    modified.push('name');
  }
  if ((existingData.yamlContent ?? '') !== formData.yamlContent) {
    modified.push('yaml');
  }
  if (
    (existingData.includedServers ?? '') !== formData.includedServers ||
    (existingData.excludedServers ?? '') !== formData.excludedServers
  ) {
    modified.push('visibility');
  }
  if ((existingData.enabled ?? true) !== formData.enabled) {
    modified.push('enabled');
  }

  return modified;
};

/** Encode fieldsModified for Segment (scalar properties only — no arrays). */
export const encodeMcpFieldsModified = (fields: McpModifiedField[]): string => fields.join(',');

export const countCustomMcpSources = (configs: McpCatalogSourceConfig[]): number =>
  configs.filter((config) => !config.isDefault).length;

export const countEnabledMcpSources = (configs: McpCatalogSourceConfig[]): number =>
  configs.filter((config) => config.enabled ?? true).length;

export const hasMcpSourceValidationErrors = (
  configs: McpCatalogSourceConfig[],
  sourceStatuses: { id: string; status?: string }[] | undefined,
): boolean => {
  if (!sourceStatuses?.length) {
    return false;
  }
  return configs.some((config) => {
    if (!(config.enabled ?? true) || config.isDefault) {
      return false;
    }
    const matching = sourceStatuses.find((source) => source.id === config.id);
    return matching?.status === 'error';
  });
};
