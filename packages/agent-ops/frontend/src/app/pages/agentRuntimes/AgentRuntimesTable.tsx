import * as React from 'react';
import { DashboardEmptyTableView, TableBase } from '@odh-dashboard/ui-core';
import { AgentRuntime } from '~/app/types/agentRuntimes';
import { getAgentRuntimeRowKey } from '~/app/utilities/agentRuntimes';
import { agentRuntimesColumns } from './columns';
import AgentRuntimesTableRow from './AgentRuntimesTableRow';

const perPageOptions = [
  { title: '5', value: 5 },
  { title: '10', value: 10 },
  { title: '20', value: 20 },
  { title: '50', value: 50 },
];

type AgentRuntimesTableProps = {
  runtimes: AgentRuntime[];
  loaded: boolean;
  continueToken?: string;
  page: number;
  pageSize: number;
  isFiltered?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onClearFilters: () => void;
  toolbarContent?: React.ReactElement;
};

const getItemCount = (
  runtimesLength: number,
  page: number,
  pageSize: number,
  continueToken: string | undefined,
  isFiltered: boolean,
): number => {
  if (isFiltered) {
    return runtimesLength;
  }
  if (continueToken) {
    // Lower bound so next-page navigation stays enabled when more results exist.
    return page * pageSize + 1;
  }
  return (page - 1) * pageSize + runtimesLength;
};

const AgentRuntimesTable: React.FC<AgentRuntimesTableProps> = ({
  runtimes,
  loaded,
  continueToken,
  page,
  pageSize,
  isFiltered = false,
  onPageChange,
  onPageSizeChange,
  onClearFilters,
  toolbarContent,
}) => {
  const itemCount = getItemCount(runtimes.length, page, pageSize, continueToken, isFiltered);

  const onNextPageClick = React.useCallback(
    (_: React.SyntheticEvent<HTMLButtonElement>, nextPage: number) => {
      if (!isFiltered && continueToken) {
        onPageChange(nextPage);
      }
    },
    [continueToken, isFiltered, onPageChange],
  );

  const onPrevPageClick = React.useCallback(
    (_: React.SyntheticEvent<HTMLButtonElement>, prevPage: number) => {
      if (!isFiltered) {
        onPageChange(prevPage);
      }
    },
    [isFiltered, onPageChange],
  );

  return (
    <TableBase
      data-testid="agent-runtimes-table"
      loading={!loaded}
      data={runtimes}
      columns={agentRuntimesColumns}
      enablePagination={loaded && (runtimes.length > 0 || page > 1) ? 'compact' : false}
      page={page}
      perPage={pageSize}
      itemCount={itemCount}
      perPageOptions={perPageOptions}
      onNextClick={onNextPageClick}
      onPreviousClick={onPrevPageClick}
      onSetPage={(_, newPage) => {
        if (isFiltered) {
          return;
        }
        if (newPage < page || !loaded) {
          onPageChange(newPage);
        }
      }}
      onPerPageSelect={(_, newSize, newPage) => {
        onPageSizeChange(newSize);
        onPageChange(newPage);
      }}
      rowRenderer={(runtime: AgentRuntime) => (
        <AgentRuntimesTableRow
          key={getAgentRuntimeRowKey(runtime.namespace, runtime.name)}
          runtime={runtime}
        />
      )}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      toolbarContent={toolbarContent}
      onClearFilters={onClearFilters}
    />
  );
};

export default AgentRuntimesTable;
