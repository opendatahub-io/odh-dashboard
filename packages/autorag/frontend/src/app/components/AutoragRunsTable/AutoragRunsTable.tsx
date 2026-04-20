import { ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import * as React from 'react';
import { TableBase } from '@odh-dashboard/internal/components/table';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import type { PipelineRun } from '~/app/types';
import { autoragRunsColumns } from './columns';
import AutoragRunsTableRow from './AutoragRunsTableRow';

/**
 * Props for {@link AutoragRunsTable}.
 * @see AutoragRunsTable.md for usage examples.
 */
type AutoragRunsTableProps = {
  runs: PipelineRun[];
  namespace: string;
  totalSize: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (pageSize: number) => void;
  onRunActionComplete?: () => void;
  toolbarContent?: React.ReactElement<typeof ToolbarItem | typeof ToolbarGroup>;
};

/**
 * Paginated table of AutoRAG pipeline runs. Supports server-side pagination and optional toolbar.
 * @see AutoragRunsTable.md for usage examples.
 */
const AutoragRunsTable: React.FC<AutoragRunsTableProps> = ({
  runs,
  namespace,
  totalSize,
  page,
  pageSize,
  onPageChange,
  onPerPageChange,
  onRunActionComplete,
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
    rowRenderer={(run) => (
      <AutoragRunsTableRow
        key={run.run_id}
        run={run}
        namespace={namespace}
        onActionComplete={onRunActionComplete}
      />
    )}
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
