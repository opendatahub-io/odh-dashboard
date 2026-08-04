import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import { createExtensionGuard } from '@odh-dashboard/plugin-core/extension-points';
import type { McpServer } from '~/app/mcpServerCatalogTypes';

export type McpCatalogCardLabelProps = {
  server: McpServer;
};

export type McpCatalogCardLabelExtension = Extension<
  'mcp-catalog.card/label',
  {
    id: string;
    component: CodeRef<React.ComponentType<McpCatalogCardLabelProps>>;
  }
>;

export const isMcpCatalogCardLabelExtension =
  createExtensionGuard<McpCatalogCardLabelExtension>('mcp-catalog.card/label');
