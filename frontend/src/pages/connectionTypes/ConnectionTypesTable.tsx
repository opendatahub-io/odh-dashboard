import * as React from 'react';
import { FilterDataType, initialFilterData } from '~/pages/connectionTypes/const';
import { connectionTypeColumns } from '~/pages/connectionTypes/columns';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import ConnectionTypesTableRow from '~/pages/connectionTypes/ConnectionTypesTableRow';
import ConnectionTypesTableToolbar from '~/pages/connectionTypes/ConnectionTypesTableToolbar';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { Table } from '~/components/table';
import {
  getCreatorFromK8sResource,
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
} from '~/concepts/k8s/utils';

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

  const filteredConnectionTypes = React.useMemo(
    () =>
      connectionTypes.filter((connectionType) => {
        const keywordFilter = filterData.Keyword?.toLowerCase();
        const createFilter = filterData['Created by']?.toLowerCase();

        if (
          keywordFilter &&
          !getDisplayNameFromK8sResource(connectionType).toLowerCase().includes(keywordFilter) &&
          !getDescriptionFromK8sResource(connectionType).toLowerCase().includes(keywordFilter)
        ) {
          return false;
        }

        return (
          !createFilter ||
          getCreatorFromK8sResource(connectionType).toLowerCase().includes(createFilter)
        );
      }),
    [connectionTypes, filterData],
  );

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
    />
  );
};

export default ConnectionTypesTable;
