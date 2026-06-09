import * as React from 'react';
import Table from '@odh-dashboard/internal/components/table/Table';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { AgentRuntime } from '~/app/types/agentRuntimes';
import { agentRuntimesColumns } from './columns';
import AgentRuntimesTableRow from './AgentRuntimesTableRow';

type AgentRuntimesTableProps = {
  runtimes: AgentRuntime[];
  onClearFilters: () => void;
  toolbarContent?: React.ReactElement;
};

const AgentRuntimesTable: React.FC<AgentRuntimesTableProps> = ({
  runtimes,
  onClearFilters,
  toolbarContent,
}) => (
  <Table
    data-testid="agent-runtimes-table"
    data={runtimes}
    columns={agentRuntimesColumns}
    enablePagination
    rowRenderer={(runtime: AgentRuntime) => (
      <AgentRuntimesTableRow
        key={`${runtime.namespace}/${runtime.name}`}
        runtime={runtime}
      />
    )}
    emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
    toolbarContent={toolbarContent}
    onClearFilters={onClearFilters}
  />
);

export default AgentRuntimesTable;
