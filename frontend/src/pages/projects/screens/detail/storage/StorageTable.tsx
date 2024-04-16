import * as React from 'react';
import { Table } from '~/components/table';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import DeletePVCModal from '~/pages/projects/pvc/DeletePVCModal';
import StorageTableRow from './StorageTableRow';
import { columns } from './data';
import ManageStorageModal from './ManageStorageModal';

type StorageTableProps = {
  pvcs: PersistentVolumeClaimKind[];
  refresh: () => void;
  onAddPVC: () => void;
};

const StorageTable: React.FC<StorageTableProps> = ({ pvcs, refresh, onAddPVC }) => {
  const [deleteStorage, setDeleteStorage] = React.useState<PersistentVolumeClaimKind | undefined>();
  const [editPVC, setEditPVC] = React.useState<PersistentVolumeClaimKind | undefined>();

  return (
    <>
      <Table
        data={pvcs}
        columns={columns}
        disableRowRenderSupport
        data-testid="storage-table"
        variant="compact"
        rowRenderer={(pvc, i) => (
          <StorageTableRow
            key={pvc.metadata.uid}
            rowIndex={i}
            obj={pvc}
            onEditPVC={setEditPVC}
            onDeletePVC={setDeleteStorage}
            onAddPVC={onAddPVC}
          />
        )}
      />
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
