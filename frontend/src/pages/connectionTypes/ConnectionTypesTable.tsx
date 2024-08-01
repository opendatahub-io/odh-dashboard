import * as React from 'react';
import { initialFilterData, ConnectionTypes } from '~/pages/connectionTypes/const';
import { TableBase } from '~/components/table';
import { connectionTypeColumns } from '~/pages/connectionTypes/columns';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import ConnectionTypesTableRow from '~/pages/connectionTypes/ConnectionTypesTableRow';
import ConnectionTypesTableToolbar from '~/pages/connectionTypes/ConnectionTypesTableToolbar';

type ConnectionTypesTableProps = {
  connectionTypes: ConnectionTypes[];
};

const ConnectionTypesTable: React.FC<ConnectionTypesTableProps> = ({ connectionTypes }) => {
  const [filterData, setFilterData] = React.useState(initialFilterData);
  const onClearFilters = React.useCallback(() => setFilterData(initialFilterData), [setFilterData]);

  return (
    <>
      <TableBase
        variant="compact"
        data={connectionTypes}
        columns={connectionTypeColumns}
        data-testid="connectionTypes-list-table"
        rowRenderer={(connectionType) => (
          <ConnectionTypesTableRow key={connectionType.id} obj={connectionType} />
        )}
        toolbarContent={
          <ConnectionTypesTableToolbar
            filterData={filterData}
            setFilterData={setFilterData}
            onClearFilters={onClearFilters}
          />
        }
        disableItemCount
        emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
        id="connectionTypes-list-table"
      />
    </>
  );
};

export default ConnectionTypesTable;
