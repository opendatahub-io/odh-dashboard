import * as React from 'react';
import { TableComposable, Tbody, Th, Thead, Tr } from '@patternfly/react-table';
import StorageTableRow from './StorageTableRow';
import { columns } from './data';
import useTableColumnSort from '../../../../../utilities/useTableColumnSort';
import { PersistentVolumeClaimKind } from '../../../../../k8sTypes';
import DeletePVCModal from '../../../pvc/DeletePVCModal';
import ManageStorageModal from './ManageStorageModal';

type StorageTableProps = {
  pvcs: PersistentVolumeClaimKind[];
  refreshPVCs: () => void;
};

const StorageTable: React.FC<StorageTableProps> = ({ pvcs: unsortedPvcs, refreshPVCs }) => {
  const [deleteStorage, setDeleteStorage] = React.useState<PersistentVolumeClaimKind | undefined>();
  const [editPVC, setEditPVC] = React.useState<PersistentVolumeClaimKind | undefined>();
  const sort = useTableColumnSort<PersistentVolumeClaimKind>(columns, 1);
  const sortedPvcs = sort.transformData(unsortedPvcs);

  return (
    <>
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
            <StorageTableRow
              key={pvc.metadata.uid}
              obj={pvc}
              onEditPVC={setEditPVC}
              onDeletePVC={setDeleteStorage}
            />
          ))}
        </Tbody>
      </TableComposable>
      <ManageStorageModal
        isOpen={!!editPVC}
        existingData={editPVC}
        onClose={(updated) => {
          if (updated) {
            refreshPVCs();
          }
          setEditPVC(undefined);
        }}
      />
      <DeletePVCModal
        pvcToDelete={deleteStorage}
        onClose={(deleted) => {
          if (deleted) {
            refreshPVCs();
          }
          setDeleteStorage(undefined);
        }}
      />
    </>
  );
};

export default StorageTable;
