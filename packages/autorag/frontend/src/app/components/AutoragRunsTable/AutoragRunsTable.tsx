import { ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import * as React from 'react';
import { TableBase } from '@odh-dashboard/internal/components/table';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import type { PipelineRun } from '~/app/types';
import { autoragRunsColumns } from './columns';
import AutoragRunsTableRow from './AutoragRunsTableRow';

type AutoragRunsTableProps = {
  runs: PipelineRun[];
  totalSize: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (pageSize: number) => void;
  toolbarContent?: React.ReactElement<typeof ToolbarItem | typeof ToolbarGroup>;
};

const AutoragRunsTable: React.FC<AutoragRunsTableProps> = ({
  runs,
  totalSize,
  page,
  pageSize,
  onPageChange,
  onPerPageChange,
  toolbarContent,
}) => (
  <TableBase
    data-testid="autorag-runs-table"
    id="autorag-runs-table"
    enablePagination={totalSize > 0}
    data={runs}
    columns={autoragRunsColumns}
    defaultSortColumn={0}
    emptyTableView={<DashboardEmptyTableView onClearFilters={() => undefined} />}
    toolbarContent={toolbarContent}
    rowRenderer={(run) => <AutoragRunsTableRow key={run.run_id} run={run} />}
    itemCount={totalSize}
    page={page}
    perPage={pageSize}
    onSetPage={(_e, newPage) => onPageChange(newPage)}
    onPerPageSelect={(_e, newSize, newPage) => {
      onPerPageChange(newSize);
      onPageChange(newPage);
    }}
  />
);

export default AutoragRunsTable;
