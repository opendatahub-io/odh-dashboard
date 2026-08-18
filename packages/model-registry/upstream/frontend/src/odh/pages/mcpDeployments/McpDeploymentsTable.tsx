import * as React from 'react';
import { Table, DashboardEmptyTableView } from 'mod-arch-shared';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { isTabRouteTabExtension } from '@odh-dashboard/plugin-core/extension-points';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import { getMcpDeploymentColumns } from './McpDeploymentsTableColumns';
import McpDeploymentsTableRow from './McpDeploymentsTableRow';

const MCP_SERVERS_PAGE_ID = 'mcp-servers-tab-page';
const MCP_REGISTRY_TAB_ID = 'registry';

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
  const tabExtensions = useExtensions(isTabRouteTabExtension);
  const showRegisteredVersion = tabExtensions.some(
    (ext) =>
      ext.properties.pageId === MCP_SERVERS_PAGE_ID && ext.properties.id === MCP_REGISTRY_TAB_ID,
  );
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
