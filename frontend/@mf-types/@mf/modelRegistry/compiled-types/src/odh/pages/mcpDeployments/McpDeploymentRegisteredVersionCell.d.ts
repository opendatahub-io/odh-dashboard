import * as React from 'react';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
type McpDeploymentRegisteredVersionCellProps = {
    deployment: McpDeployment;
};
/** Renders the "Registered version" column: a link to the deployment's exact MCP
 * Registry version, or '-' for catalog-sourced deployments. */
declare const McpDeploymentRegisteredVersionCell: React.FC<McpDeploymentRegisteredVersionCellProps>;
export default McpDeploymentRegisteredVersionCell;
