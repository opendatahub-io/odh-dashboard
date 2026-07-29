import * as React from 'react';
import { McpCatalogSourceConfig } from '~/app/mcpServerCatalogTypes';
type McpCatalogSourceConfigsTableRowProps = {
    mcpCatalogSourceConfig: McpCatalogSourceConfig;
    onDeleteSource: (sourceId: string) => Promise<void>;
    isUpdatingToggle: boolean;
    onToggleUpdate: (checked: boolean, sourceConfig: McpCatalogSourceConfig) => void;
};
declare const McpCatalogSourceConfigsTableRow: React.FC<McpCatalogSourceConfigsTableRowProps>;
export default McpCatalogSourceConfigsTableRow;
