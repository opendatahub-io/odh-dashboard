import * as React from 'react';
import { McpCatalogSourceConfig } from '~/app/mcpServerCatalogTypes';
type McpCatalogSourceStatusProps = {
    mcpCatalogSourceConfig: McpCatalogSourceConfig;
};
declare const McpCatalogSourceStatus: React.FC<McpCatalogSourceStatusProps>;
export default McpCatalogSourceStatus;
