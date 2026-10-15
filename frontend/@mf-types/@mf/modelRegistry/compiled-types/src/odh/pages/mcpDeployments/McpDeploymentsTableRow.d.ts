import * as React from 'react';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
type McpDeploymentsTableRowProps = {
    deployment: McpDeployment;
    /** Must match the same flag McpDeploymentsTable used to build its columns, or cells and
     * headers will fall out of alignment. */
    showRegisteredVersion: boolean;
    onDeleteClick: (deployment: McpDeployment) => void;
    onEditClick: (deployment: McpDeployment) => void;
};
declare const McpDeploymentsTableRow: React.FC<McpDeploymentsTableRowProps>;
export default McpDeploymentsTableRow;
