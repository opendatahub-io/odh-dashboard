import React from 'react';

import { Table } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { columns, initialScFilterData, StorageClassFilterData } from './constants';
import { isValidConfigValue } from './utils';
import { StorageClassesTableRow } from './StorageClassesTableRow';
import { StorageClassFilterToolbar } from './StorageClassFilterToolbar';
import { useStorageClassContext } from './StorageClassesContext';

export const StorageClassesTable: React.FC = () => {
  const { storageClasses, storageClassConfigs } = useStorageClassContext();
  const [filterData, setFilterData] = React.useState<StorageClassFilterData>(initialScFilterData);

  const filteredStorageClasses = React.useMemo(
    () =>
      storageClasses.filter((sc) => {
        const displayNameFilter = filterData.displayName.toLowerCase();
        const openshiftScNameFilter = filterData.openshiftScName.toLowerCase();
        const configDisplayName = storageClassConfigs[sc.metadata.name]?.displayName;

        if (
          displayNameFilter &&
          !(
            isValidConfigValue('displayName', configDisplayName) &&
            configDisplayName?.toLowerCase().includes(displayNameFilter)
          )
        ) {
          return false;
        }

        return (
          !openshiftScNameFilter || sc.metadata.name.toLowerCase().includes(openshiftScNameFilter)
        );
      }),
    [filterData.displayName, filterData.openshiftScName, storageClasses, storageClassConfigs],
  );

  return (
    <Table
      enablePagination
      variant="compact"
      data={filteredStorageClasses}
      columns={columns}
      emptyTableView={
        <DashboardEmptyTableView onClearFilters={() => setFilterData(initialScFilterData)} />
      }
      data-testid="storage-classes-table"
      rowRenderer={(storageClass) => (
        <StorageClassesTableRow key={storageClass.metadata.name} storageClass={storageClass} />
      )}
      toolbarContent={
        <StorageClassFilterToolbar filterData={filterData} setFilterData={setFilterData} />
      }
    />
  );
};
