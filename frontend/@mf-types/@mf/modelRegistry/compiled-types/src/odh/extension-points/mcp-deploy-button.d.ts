import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
/**
 * Extension point for providing the MCP deploy button component.
 * This allows the downstream (ODH) to provide the deploy button
 * on the upstream MCP server details page without the upstream
 * code depending on downstream components.
 */
export type McpDeployButtonExtension = Extension<'mcp-catalog.mcp-server/deploy-button', {
    component: ComponentCodeRef;
}>;
export declare const isMcpDeployButtonExtension: (extension: Extension) => extension is McpDeployButtonExtension;
