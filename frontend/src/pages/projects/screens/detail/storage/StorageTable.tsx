import * as React from 'react';
import { Alert, AlertActionCloseButton } from '@patternfly/react-core';
import { Table } from '#~/components/table';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import DeletePVCModal from '#~/pages/projects/pvc/DeletePVCModal';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { getStorageClassConfig } from '#~/pages/storageClasses/utils';
import useStorageClasses from '#~/concepts/k8s/useStorageClasses';
import StorageTableRow from './StorageTableRow';
import { columns } from './data';
import { StorageTableData } from './types';
import ClusterStorageModal from './ClusterStorageModal';

type StorageTableProps = {
  pvcs: PersistentVolumeClaimKind[];
  refresh: () => void;
  onAddPVC: () => void;
};

const StorageTable: React.FC<StorageTableProps> = ({ pvcs, refresh, onAddPVC }) => {
  const [deleteStorage, setDeleteStorage] = React.useState<PersistentVolumeClaimKind | undefined>();
  const [editPVC, setEditPVC] = React.useState<PersistentVolumeClaimKind | undefined>();
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const [storageClasses, storageClassesLoaded] = useStorageClasses();
  const [alertDismissed, setAlertDismissed] = React.useState<boolean>(false);
  
  const storageTableData: StorageTableData[] = pvcs.map((pvc) => ({
    pvc,
    storageClass: storageClasses.find((sc) => sc.metadata.name === pvc.spec.storageClassName),
    accessModes: pvc.spec.accessModes,
  }));
  const isDeprecatedAlert = React.useMemo(
    () =>
      storageClassesLoaded &&
      storageTableData.some(
        (data) =>
          !data.storageClass || getStorageClassConfig(data.storageClass)?.isEnabled === false,
      ),
    [storageClassesLoaded, storageTableData],
  );
  const shouldShowAlert = isDeprecatedAlert && !alertDismissed && isStorageClassesAvailable;
  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;

  const getStorageColumns = () => {
    let storageColumns = columns;

    if (!isStorageClassesAvailable) {
      storageColumns = columns.filter((column) => column.field !== 'storage');
    }

    if (!workbenchEnabled) {
      storageColumns = storageColumns.filter((column) => column.field !== 'connected');
    }

    return storageColumns;
  };

  return (
    <>
      {shouldShowAlert && (
        <Alert
          data-testid="storage-class-deprecated-alert"
          variant="warning"
          isInline
          title="Deprecated storage class"
          actionClose={
            <AlertActionCloseButton
              data-testid="storage-class-deprecated-alert-close-button"
              onClose={() => setAlertDismissed(true)}
            />
          }
        >
          One or more storage classes have been deprecated by your administrator, but the cluster
          storage instances using them remain active. If you want to migrate your data to a cluster
          storage instance using a different storage class, contact your administrator.
        </Alert>
      )}
      <Table
        data={storageTableData}
        columns={getStorageColumns()}
        data-testid="storage-table"
        variant="compact"
        rowRenderer={(data, i) => (
          <StorageTableRow
            key={data.pvc.metadata.uid}
            rowIndex={i}
            obj={data}
            storageClassesLoaded={storageClassesLoaded}
            onEditPVC={setEditPVC}
            onDeletePVC={setDeleteStorage}
            onAddPVC={onAddPVC}
          />
        )}
      />
      {editPVC ? (
        <ClusterStorageModal
          existingPvc={editPVC}
          onClose={(updated) => {
            if (updated) {
              refresh();
            }
            setEditPVC(undefined);
          }}
        />
      ) : null}
      {deleteStorage ? (
        <DeletePVCModal
          pvcToDelete={deleteStorage}
          onClose={(deleted) => {
            if (deleted) {
              refresh();
            }
            setDeleteStorage(undefined);
          }}
        />
      ) : null}
    </>
  );
};

export default StorageTable;
