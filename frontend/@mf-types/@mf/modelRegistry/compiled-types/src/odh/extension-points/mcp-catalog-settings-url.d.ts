import type { Extension, ExtensionPredicate } from '@openshift/dynamic-plugin-sdk';
/**
 * Extension point for providing the MCP catalog settings URL.
 * This allows ODH to inject its own settings URL for the MCP catalog settings page
 * without hardcoding the path in the model registry package.
 */
export type McpCatalogSettingsUrlExtension = Extension<'mcp-catalog.settings/url', {
    /**
     * The MCP catalog settings URL path.
     */
    url: string;
    /**
     * The display title for the settings page link.
     */
    title: string;
}>;
export declare const isMcpCatalogSettingsUrlExtension: ExtensionPredicate<McpCatalogSettingsUrlExtension>;
