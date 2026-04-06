import { ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import * as React from 'react';
import { TableBase } from '@odh-dashboard/internal/components/table';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import type { PipelineRun } from '~/app/types';
import { automlRunsColumns } from './columns';
import AutomlRunsTableRow from './AutomlRunsTableRow';

type AutomlRunsTableProps = {
  runs: PipelineRun[];
  totalSize: number;
  page: number;
  pageSize: number;
  namespace: string;
  onPageChange: (page: number) => void;
  onPerPageChange: (pageSize: number) => void;
  toolbarContent?: React.ReactElement<typeof ToolbarItem | typeof ToolbarGroup>;
};

const AutomlRunsTable: React.FC<AutomlRunsTableProps> = ({
  runs,
  totalSize,
  page,
  pageSize,
  namespace,
  onPageChange,
  onPerPageChange,
  toolbarContent,
}) => (
  <TableBase
    data-testid="automl-runs-table"
    id="automl-runs-table"
    enablePagination={totalSize > pageSize}
    data={runs}
    columns={automlRunsColumns}
    emptyTableView={<DashboardEmptyTableView onClearFilters={() => undefined} />}
    toolbarContent={toolbarContent}
    rowRenderer={(run) => <AutomlRunsTableRow key={run.run_id} run={run} namespace={namespace} />}
    itemCount={totalSize}
    page={page}
    perPage={pageSize}
    onSetPage={(_e, newPage) => onPageChange(newPage)}
    onPerPageSelect={(_e, newSize) => onPerPageChange(newSize)}
  />
);

export default AutomlRunsTable;
