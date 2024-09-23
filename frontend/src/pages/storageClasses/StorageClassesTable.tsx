import React from 'react';

import { StorageClassConfig, StorageClassKind } from '~/k8sTypes';
import { FetchStateRefreshPromise } from '~/utilities/useFetchState';
import { Table } from '~/components/table';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import { columns, initialScFilterData, StorageClassFilterData } from './constants';
import { getStorageClassConfig, isValidConfigValue } from './utils';
import { StorageClassesTableRow } from './StorageClassesTableRow';
import { StorageClassFilterToolbar } from './StorageClassFilterToolbar';

interface StorageClassesTableProps {
  storageClasses: StorageClassKind[];
  refresh: FetchStateRefreshPromise<StorageClassKind[]>;
}

export const StorageClassesTable: React.FC<StorageClassesTableProps> = ({
  storageClasses,
  refresh,
}) => {
  const [filterData, setFilterData] = React.useState<StorageClassFilterData>(initialScFilterData);

  const storageClassConfigMap = React.useMemo(
    () =>
      storageClasses.reduce((acc: Record<string, StorageClassConfig | undefined>, sc) => {
        acc[sc.metadata.name] = getStorageClassConfig(sc);

        return acc;
      }, {}),
    [storageClasses],
  );

  const filteredStorageClasses = React.useMemo(
    () =>
      storageClasses.filter((sc) => {
        const displayNameFilter = filterData.displayName.toLowerCase();
        const openshiftScNameFilter = filterData.openshiftScName.toLowerCase();
        const configDisplayName = storageClassConfigMap[sc.metadata.name]?.displayName;

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
    [filterData.displayName, filterData.openshiftScName, storageClasses, storageClassConfigMap],
  );

  return (
    <Table
      enablePagination
      variant="compact"
      data={filteredStorageClasses}
      hasNestedHeader
      columns={columns}
      emptyTableView={
        <DashboardEmptyTableView onClearFilters={() => setFilterData(initialScFilterData)} />
      }
      data-testid="storage-classes-table"
      rowRenderer={(storageClass) => (
        <StorageClassesTableRow
          key={storageClass.metadata.name}
          storageClass={storageClass}
          storageClassConfigMap={storageClassConfigMap}
          refresh={refresh}
        />
      )}
      toolbarContent={
        <StorageClassFilterToolbar filterData={filterData} setFilterData={setFilterData} />
      }
    />
  );
};
