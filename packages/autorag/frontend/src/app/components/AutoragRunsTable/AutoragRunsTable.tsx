import { ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import * as React from 'react';
import Table from '@odh-dashboard/internal/components/table/Table';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import type { PipelineRun } from '~/app/types';
import { autoragRunsColumns } from './columns';
import AutoragRunsTableRow from './AutoragRunsTableRow';

type AutoragRunsTableProps = {
  runs: PipelineRun[];
  toolbarContent?: React.ReactElement<typeof ToolbarItem | typeof ToolbarGroup>;
};

const AutoragRunsTable: React.FC<AutoragRunsTableProps> = ({ runs, toolbarContent }) => (
  <Table
    data-testid="autorag-runs-table"
    id="autorag-runs-table"
    enablePagination={runs.length > 0}
    data={runs}
    columns={autoragRunsColumns}
    defaultSortColumn={0}
    emptyTableView={<DashboardEmptyTableView onClearFilters={() => undefined} />}
    toolbarContent={toolbarContent}
    rowRenderer={(run) => <AutoragRunsTableRow key={run.id} run={run} />}
  />
);

export default AutoragRunsTable;
