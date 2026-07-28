import type { Extension, ExtensionPredicate, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { McpServer } from '../../app/mcpServerCatalogTypes';
export type McpCatalogCardLabelProps = {
    server: McpServer;
};
export type McpCatalogCardLabelExtension = Extension<'mcp-catalog.card/label', {
    id: string;
    component: CodeRef<React.ComponentType<McpCatalogCardLabelProps>>;
}>;
export declare const isMcpCatalogCardLabelExtension: ExtensionPredicate<McpCatalogCardLabelExtension>;
