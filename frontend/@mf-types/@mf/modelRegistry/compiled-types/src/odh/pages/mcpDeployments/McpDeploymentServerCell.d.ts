import * as React from 'react';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
type McpDeploymentServerCellProps = {
    deployment: McpDeployment;
};
/** Renders the "MCP server" column as plain text: the registry display name,
 * the catalog display name stored in the annotation, or '-' as a fallback. */
declare const McpDeploymentServerCell: React.FC<McpDeploymentServerCellProps>;
export default McpDeploymentServerCell;
