import { McpCatalogSourceConfig } from '~/app/mcpServerCatalogTypes';
import { ManageMcpSourceFormData } from '~/app/pages/mcpCatalogSettings/useManageMcpSourceData';
/** Event names for MCP Catalog Sources admin settings (RHOAIUX-2770). */
export declare const MCP_CATALOG_SOURCES_EVENTS: {
    readonly SETTINGS_VIEWED: "MCP Catalog Sources Settings Viewed";
    readonly ADD_SOURCE_SELECTED: "MCP Catalog Sources Add Source Selected";
    readonly SOURCE_ADDED: "MCP Catalog Sources Source Added";
    readonly SOURCE_ENABLE_TOGGLED: "MCP Catalog Sources Source Enable Toggled";
    readonly MANAGE_SOURCE_SELECTED: "MCP Catalog Sources Manage Source Selected";
    readonly SOURCE_UPDATED: "MCP Catalog Sources Source Updated";
    readonly SOURCE_DELETED: "MCP Catalog Sources Source Deleted";
    readonly PREVIEW_COMPLETED: "MCP Catalog Sources Preview Completed";
    readonly PREVIEW_SELECTED: "MCP Catalog Sources Preview Selected";
    readonly YAML_FORMAT_DRAWER_OPENED: "MCP Catalog Sources Yaml Format Drawer Opened";
};
export type McpTrackingSourceType = 'preloaded' | 'custom';
export type McpPreloadedTier = 'red_hat_validated' | 'partner' | 'community';
export type McpTrackingFormContext = 'add_source' | 'manage_source';
export type McpServerVisibilityType = 'all' | 'filtered';
export type McpModifiedField = 'name' | 'yaml' | 'visibility' | 'enabled';
export declare const getMcpTrackingSourceType: (config: {
    isDefault?: boolean;
}) => McpTrackingSourceType;
/**
 * Best-effort tier from path/labels. Returns undefined when unknown or custom
 * (Segment properties omit undefined; do not send source name / YAML content).
 */
export declare const getMcpPreloadedTier: (config: {
    isDefault?: boolean;
    yamlCatalogPath?: string;
    labels?: string[];
}) => McpPreloadedTier | undefined;
export declare const getMcpServerVisibilityType: (includedServers: string[] | undefined, excludedServers: string[] | undefined) => McpServerVisibilityType;
export declare const getMcpServerVisibilityTypeFromForm: (formData: Pick<ManageMcpSourceFormData, "includedServers" | "excludedServers">) => McpServerVisibilityType;
export declare const hasMcpVisibilityFilters: (formData: Pick<ManageMcpSourceFormData, "includedServers" | "excludedServers">) => boolean;
export declare const getMcpFieldsModified: (formData: ManageMcpSourceFormData, existingData: Partial<ManageMcpSourceFormData> | undefined) => McpModifiedField[];
/** Encode fieldsModified for Segment (scalar properties only — no arrays). */
export declare const encodeMcpFieldsModified: (fields: McpModifiedField[]) => string;
export declare const countCustomMcpSources: (configs: McpCatalogSourceConfig[]) => number;
export declare const countEnabledMcpSources: (configs: McpCatalogSourceConfig[]) => number;
export declare const hasMcpSourceValidationErrors: (configs: McpCatalogSourceConfig[], sourceStatuses: {
    id: string;
    status?: string;
}[] | undefined) => boolean;
