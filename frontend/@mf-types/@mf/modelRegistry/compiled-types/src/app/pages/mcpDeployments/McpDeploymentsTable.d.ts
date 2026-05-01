import * as React from 'react';
import { Table } from 'mod-arch-shared';
import { McpDeployment } from '~/app/mcpDeploymentTypes';
type McpDeploymentsTableProps = {
    deployments: McpDeployment[];
    onClearFilters: () => void;
    onDeleteClick: (deployment: McpDeployment) => void;
    onEditClick: (deployment: McpDeployment) => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;
declare const McpDeploymentsTable: React.FC<McpDeploymentsTableProps>;
export default McpDeploymentsTable;
