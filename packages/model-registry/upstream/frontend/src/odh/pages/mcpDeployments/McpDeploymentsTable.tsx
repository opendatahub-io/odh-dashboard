import * as React from 'react';
import { Table, DashboardEmptyTableView } from 'mod-arch-shared';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import useMcpRegistryAvailable from '~/odh/hooks/useMcpRegistryAvailable';
import { getMcpDeploymentColumns } from './McpDeploymentsTableColumns';
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
}) => {
  const showRegisteredVersion = useMcpRegistryAvailable();
  const columns = React.useMemo(
    () => getMcpDeploymentColumns(showRegisteredVersion),
    [showRegisteredVersion],
  );
  // 'Created' is sortable-by-default; its index shifts by one when the Registered version
  // column (which sits before it) is hidden.
  const defaultSortColumn = showRegisteredVersion ? 3 : 2;

  return (
    <Table
      data-testid="mcp-deployments-table"
      data={deployments}
      columns={columns}
      defaultSortColumn={defaultSortColumn}
      toolbarContent={toolbarContent}
      onClearFilters={onClearFilters}
      enablePagination
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      rowRenderer={(deployment) => (
        <McpDeploymentsTableRow
          key={deployment.name}
          deployment={deployment}
          showRegisteredVersion={showRegisteredVersion}
          onDeleteClick={onDeleteClick}
          onEditClick={onEditClick}
        />
      )}
    />
  );
};

export default McpDeploymentsTable;
