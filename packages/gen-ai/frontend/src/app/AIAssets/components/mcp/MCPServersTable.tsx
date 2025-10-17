import * as React from 'react';
import { useCheckboxTable, Table, DashboardEmptyTableView } from 'mod-arch-shared';
import { MCPServer, MCPServerFromAPI } from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServers';
import { useMCPSelectionContext } from '~/app/context/MCPSelectionContext';
import NoData from '~/app/EmptyStates/NoData';
import { transformMCPServerData } from '~/app/utilities/mcp';
import useMCPServersFilter from '~/app/AIAssets/hooks/useMCPServersFilter';
import {
  MCPFilterColors,
  MCPFilterOptions,
  mcpFilterOptions,
} from '~/app/AIAssets/data/mcpFilterOptions';
import MCPServerTableRow from './MCPServerTableRow';
import MCPServersToolbar from './MCPServersToolbar';
import MCPServerColumns from './MCPServerColumns';

interface MCPServersTableProps {
  /** Array of MCP servers from API */
  servers: MCPServerFromAPI[];
  /** Error from MCP servers fetch */
  error?: Error | null;
  /** Map of server statuses by server URL */
  serverStatuses: Map<string, ServerStatusInfo>;
  /** Set of server URLs currently being checked */
  statusesLoading: Set<string>;
  /** Callback to refresh servers and statuses */
  onRefresh?: () => void;
}

const MCPServersTable: React.FC<MCPServersTableProps> = ({
  servers: apiServers,
  error,
  serverStatuses,
  statusesLoading,
  onRefresh,
}) => {
  const { saveSelectedServersToPlayground } = useMCPSelectionContext();

  const transformedServers = React.useMemo(
    () => apiServers.map(transformMCPServerData),
    [apiServers],
  );

  const { filterData, onFilterUpdate, onClearFilters, filteredServers } =
    useMCPServersFilter(transformedServers);

  const serverIds = React.useMemo(
    () => filteredServers.map((server) => server.id),
    [filteredServers],
  );

  const { selections, tableProps, isSelected, toggleSelection } = useCheckboxTable(
    serverIds,
    [],
    false,
  );

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load MCP servers configuration', error);
    return (
      <NoData
        title="No MCP configuration found"
        description="This playground does not have an MCP configuration. Contact your cluster administrator to add MCP servers."
      />
    );
  }

  if (transformedServers.length === 0) {
    return (
      <NoData
        title="No valid MCP servers available"
        description="An MCP configuration exists, but no valid servers were found. Contact your cluster administrator to update the configuration."
      />
    );
  }

  return (
    <>
      <Table
        {...tableProps}
        data={filteredServers}
        columns={MCPServerColumns}
        enablePagination
        defaultSortColumn={0}
        emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
        rowRenderer={(server: MCPServer) => {
          const statusInfo = serverStatuses.get(server.connectionUrl);
          const isLoading = statusesLoading.has(server.connectionUrl);

          return (
            <MCPServerTableRow
              key={server.id}
              server={server}
              isChecked={isSelected(server.id)}
              onToggleCheck={() => toggleSelection(server.id)}
              statusInfo={statusInfo}
              isStatusLoading={isLoading}
            />
          );
        }}
        toolbarContent={
          <MCPServersToolbar
            onFilterUpdate={onFilterUpdate}
            filterData={filterData}
            filterOptions={mcpFilterOptions}
            filterColors={{
              [MCPFilterOptions.NAME]: MCPFilterColors.NAME,
              [MCPFilterOptions.KEYWORD]: MCPFilterColors.KEYWORD,
              [MCPFilterOptions.DESCRIPTION]: MCPFilterColors.DESCRIPTION,
            }}
            selectedCount={selections.length}
            selectedServerIds={selections}
            onTryInPlayground={saveSelectedServersToPlayground}
            onRefresh={onRefresh}
            onClearFilters={onClearFilters}
          />
        }
        onClearFilters={onClearFilters}
        data-testid="mcp-servers-table"
      />
    </>
  );
};

export default MCPServersTable;
