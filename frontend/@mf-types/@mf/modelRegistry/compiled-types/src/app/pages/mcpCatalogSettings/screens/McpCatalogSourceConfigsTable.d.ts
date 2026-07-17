import * as React from 'react';
import { McpCatalogSourceConfig } from '~/app/mcpServerCatalogTypes';
type McpCatalogSourceConfigsTableProps = {
    mcpCatalogSourceConfigs: McpCatalogSourceConfig[];
    onAddSource: () => void;
    onDeleteSource: (sourceId: string) => Promise<void>;
};
declare const McpCatalogSourceConfigsTable: React.FC<McpCatalogSourceConfigsTableProps>;
export default McpCatalogSourceConfigsTable;
