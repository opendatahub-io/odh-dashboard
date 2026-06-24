import * as React from 'react';
import Table from '@odh-dashboard/internal/components/table/Table';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { ModelOverviewRow, overviewColumns } from './columns';
import OverviewTableRow from './OverviewTableRow';

type OverviewTableProps = {
  data: ModelOverviewRow[];
};

const OverviewTable: React.FC<OverviewTableProps> = ({ data }) => (
  <Table
    data-testid="overview-table"
    data={data}
    columns={overviewColumns}
    enablePagination
    disableRowRenderSupport
    rowRenderer={(row: ModelOverviewRow, rowIndex: number) => (
      <OverviewTableRow key={`${row.namespace}/${row.name}`} row={row} rowIndex={rowIndex} />
    )}
    emptyTableView={<DashboardEmptyTableView onClearFilters={() => undefined} />}
  />
);

export default OverviewTable;
