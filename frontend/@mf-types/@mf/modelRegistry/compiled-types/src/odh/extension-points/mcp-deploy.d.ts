import type { Extension, ExtensionPredicate, CodeRef } from '@openshift/dynamic-plugin-sdk';
export type McpServerDeployModalExtension = Extension<'mcp-catalog.mcp-server/deploy-modal', {
    useIsDeployAvailable: CodeRef<() => {
        available: boolean;
        loaded: boolean;
    }>;
}>;
export declare const isMcpServerDeployModalExtension: ExtensionPredicate<McpServerDeployModalExtension>;
