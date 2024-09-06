import React from 'react';

import { ToolbarGroup, ToolbarItem } from '@patternfly/react-core';

import { StorageClassConfig, StorageClassKind } from '~/k8sTypes';
import { FetchStateRefreshPromise } from '~/utilities/useFetchState';
import { Table } from '~/components/table';
import { columns } from './constants';
import { getStorageClassConfig } from './utils';
import { StorageClassesTableRow } from './StorageClassesTableRow';

interface StorageClassesTableProps {
  storageClasses: StorageClassKind[];
  refresh: FetchStateRefreshPromise<StorageClassKind[]>;
}

export const StorageClassesTable: React.FC<StorageClassesTableProps> = ({
  storageClasses,
  refresh,
}) => {
  const storageClassConfigMap = React.useMemo(
    () =>
      storageClasses.reduce((acc: Record<string, StorageClassConfig | undefined>, sc) => {
        acc[sc.metadata.name] = getStorageClassConfig(sc);

        return acc;
      }, {}),
    [storageClasses],
  );

  return (
    <Table
      variant="compact"
      data={storageClasses}
      hasNestedHeader
      columns={columns}
      emptyTableView={<>{/* TODO, https://issues.redhat.com/browse/RHOAIENG-1107 */}</>}
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
        <ToolbarGroup>
          <ToolbarItem>{/* TODO, https://issues.redhat.com/browse/RHOAIENG-1107 */}</ToolbarItem>
        </ToolbarGroup>
      }
    />
  );
};
