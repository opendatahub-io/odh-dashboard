import * as React from 'react';
import { TableComposable, Tbody, Th, Thead, Tr } from '@patternfly/react-table';
import StorageTableRow from './StorageTableRow';
import { columns } from './data';
import useTableColumnSort from '../../../../../utilities/useTableColumnSort';
import { PersistentVolumeClaimKind } from '../../../../../k8sTypes';

type StorageTableProps = {
  pvcs: PersistentVolumeClaimKind[];
};

const StorageTable: React.FC<StorageTableProps> = ({ pvcs: unsortedPvcs }) => {
  const sort = useTableColumnSort<PersistentVolumeClaimKind>(columns, 1);
  const sortedPvcs = sort.transformData(unsortedPvcs);

  return (
    <TableComposable variant="compact">
      <Thead>
        <Tr>
          {columns.map((col, i) => (
            <Th key={col.field} sort={sort.getColumnSort(i)} width={col.width}>
              {col.label}
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {sortedPvcs.map((pvc) => (
          <StorageTableRow key={pvc.metadata.uid} obj={pvc} />
        ))}
      </Tbody>
    </TableComposable>
  );
};

export default StorageTable;
