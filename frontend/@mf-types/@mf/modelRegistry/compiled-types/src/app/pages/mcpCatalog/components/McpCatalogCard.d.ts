import * as React from 'react';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
type McpCatalogCardProps = {
    server: McpServer;
};
declare const McpCatalogCard: React.FC<McpCatalogCardProps>;
export default McpCatalogCard;
