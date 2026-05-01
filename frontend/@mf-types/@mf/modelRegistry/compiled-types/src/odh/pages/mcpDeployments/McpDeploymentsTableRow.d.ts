import * as React from 'react';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
type McpDeploymentsTableRowProps = {
    deployment: McpDeployment;
    onDeleteClick: (deployment: McpDeployment) => void;
    onEditClick: (deployment: McpDeployment) => void;
};
declare const McpDeploymentsTableRow: React.FC<McpDeploymentsTableRowProps>;
export default McpDeploymentsTableRow;
