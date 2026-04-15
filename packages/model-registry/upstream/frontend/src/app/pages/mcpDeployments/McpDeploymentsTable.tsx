import * as React from 'react';
import { Table, DashboardEmptyTableView } from 'mod-arch-shared';
import { McpDeployment } from '~/app/mcpDeploymentTypes';
import { mcpDeploymentColumns } from './McpDeploymentsTableColumns';
import McpDeploymentsTableRow from './McpDeploymentsTableRow';

type McpDeploymentsTableProps = {
  deployments: McpDeployment[];
  onClearFilters: () => void;
  onDeleteClick: (deployment: McpDeployment) => void;
  onEditClick: (deployment: McpDeployment) => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const McpDeploymentsTable: React.FC<McpDeploymentsTableProps> = ({
  deployments,
  toolbarContent,
  onClearFilters,
  onDeleteClick,
  onEditClick,
}) => (
  <Table
    data-testid="mcp-deployments-table"
    data={deployments}
    columns={mcpDeploymentColumns}
    defaultSortColumn={2}
    toolbarContent={toolbarContent}
    onClearFilters={onClearFilters}
    enablePagination
    emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
    rowRenderer={(deployment) => (
      <McpDeploymentsTableRow
        key={deployment.name}
        deployment={deployment}
        onDeleteClick={onDeleteClick}
        onEditClick={onEditClick}
      />
    )}
  />
);

export default McpDeploymentsTable;
