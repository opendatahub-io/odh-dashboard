import React from 'react';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
declare const McpServerDeployAction: React.FC<{
    server: {
        data: McpServer | null;
    };
}>;
export default McpServerDeployAction;
