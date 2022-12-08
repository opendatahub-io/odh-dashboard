import * as React from 'react';
import { TableComposable, Th, Thead, Tr } from '@patternfly/react-table';
import StorageTableRow from './StorageTableRow';
import { columns } from './data';
import useTableColumnSort from '../../../../../utilities/useTableColumnSort';
import { PersistentVolumeClaimKind } from '../../../../../k8sTypes';
import DeletePVCModal from '../../../pvc/DeletePVCModal';
import ManageStorageModal from './ManageStorageModal';

type StorageTableProps = {
  pvcs: PersistentVolumeClaimKind[];
  refresh: () => void;
  onAddPVC: () => void;
};

const StorageTable: React.FC<StorageTableProps> = ({ pvcs: unsortedPvcs, refresh, onAddPVC }) => {
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
        {sortedPvcs.map((pvc) => (
          <StorageTableRow
            key={pvc.metadata.uid}
            obj={pvc}
            onEditPVC={setEditPVC}
            onDeletePVC={setDeleteStorage}
            onAddPVC={onAddPVC}
          />
        ))}
      </TableComposable>
      <ManageStorageModal
        isOpen={!!editPVC}
        existingData={editPVC}
        onClose={(updated) => {
          if (updated) {
            refresh();
          }
          setEditPVC(undefined);
        }}
      />
      <DeletePVCModal
        pvcToDelete={deleteStorage}
        onClose={(deleted) => {
          if (deleted) {
            refresh();
          }
          setDeleteStorage(undefined);
        }}
      />
    </>
  );
};

export default StorageTable;
