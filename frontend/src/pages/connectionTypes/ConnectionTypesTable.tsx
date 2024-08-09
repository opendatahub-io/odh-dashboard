import * as React from 'react';
import { FilterDataType, initialFilterData } from '~/pages/connectionTypes/const';
import { connectionTypeColumns } from '~/pages/connectionTypes/columns';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import ConnectionTypesTableRow from '~/pages/connectionTypes/ConnectionTypesTableRow';
import ConnectionTypesTableToolbar from '~/pages/connectionTypes/ConnectionTypesTableToolbar';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { Table } from '~/components/table';

interface ConnectionTypesTableProps {
  connectionTypes: ConnectionTypeConfigMapObj[];
  onUpdate: () => void;
}

const ConnectionTypesTable: React.FC<ConnectionTypesTableProps> = ({
  connectionTypes,
  onUpdate,
}) => {
  const [filterData, setFilterData] = React.useState<FilterDataType>(initialFilterData);
  const onClearFilters = React.useCallback(() => setFilterData(initialFilterData), [setFilterData]);

  const filteredConnectionTypes = connectionTypes.filter((connectionType) => {
    const keywordFilter = filterData.Keyword?.toLowerCase();
    const createFilter = filterData['Created by']?.toLowerCase();

    if (
      keywordFilter &&
      !(
        connectionType.metadata.annotations?.['openshift.io/display-name'] ||
        connectionType.metadata.name
      )
        .toLowerCase()
        .includes(keywordFilter) &&
      !connectionType.metadata.annotations?.['openshift.io/description']
        ?.toLowerCase()
        .includes(keywordFilter)
    ) {
      return false;
    }

    return (
      !createFilter ||
      (connectionType.metadata.annotations?.['opendatahub.io/username'] || 'unknown')
        .toLowerCase()
        .includes(createFilter)
    );
  });

  const resetFilters = () => {
    setFilterData(initialFilterData);
  };

  return (
    <Table
      variant="compact"
      data={filteredConnectionTypes}
      columns={connectionTypeColumns}
      defaultSortColumn={0}
      data-testid="connection-types-table"
      rowRenderer={(connectionType) => (
        <ConnectionTypesTableRow
          key={connectionType.metadata.name}
          obj={connectionType}
          onUpdate={onUpdate}
        />
      )}
      toolbarContent={
        <ConnectionTypesTableToolbar
          filterData={filterData}
          setFilterData={setFilterData}
          onClearFilters={onClearFilters}
        />
      }
      disableItemCount
      emptyTableView={<DashboardEmptyTableView onClearFilters={resetFilters} />}
      id="connectionTypes-list-table"
    />
  );
};

export default ConnectionTypesTable;
