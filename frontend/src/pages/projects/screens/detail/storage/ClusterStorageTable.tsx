import React from 'react';
import { Table } from '#~/components/table';
import { ClusterStorageNotebookSelection } from '#~/pages/projects/types';
import { NotebookKind, PersistentVolumeClaimKind } from '#~/k8sTypes';
import { MountPathFormat } from '#~/pages/projects/screens/spawner/storage/types';
import { getNotebookPVCMountPathMap } from '#~/pages/projects/notebook/utils';
import { MOUNT_PATH_PREFIX } from '#~/pages/projects/screens/spawner/storage/const';
import { storageColumns } from './clusterTableColumns';
import ClusterStorageTableRow from './ClusterStorageTableRow';
import { getInUseMountPaths, validateClusterMountPath } from './utils';

type ClusterStorageTableProps = {
  notebookData: ClusterStorageNotebookSelection[];
  allNotebooks: NotebookKind[];
  setNotebookData: React.Dispatch<React.SetStateAction<ClusterStorageNotebookSelection[]>>;
  notebookLoaded: boolean;
  connectedNotebooks: NotebookKind[];
  existingPvc: PersistentVolumeClaimKind | undefined;
};

const ClusterStorageTable: React.FC<ClusterStorageTableProps> = ({
  notebookData,
  setNotebookData,
  allNotebooks,
  notebookLoaded,
  connectedNotebooks,
  existingPvc,
}) => {
  const availableNotebooks = React.useMemo(
    () =>
      allNotebooks.filter(
        (currentNotebookData) =>
          !notebookData.some(
            (currentNotebook) => currentNotebook.name === currentNotebookData.metadata.name,
          ),
      ),
    [allNotebooks, notebookData],
  );

  const handleMountPathUpdate = React.useCallback(
    (rowIndex: number, value: string, format: MountPathFormat) => {
      const notebook = notebookData[rowIndex];
      const prefix = format === MountPathFormat.STANDARD ? MOUNT_PATH_PREFIX : '/';
      const newValue = `${prefix}${value}`;

      const inUseMountPaths = getInUseMountPaths(
        notebook.name,
        allNotebooks,
        existingPvc?.metadata.name,
      );

      const existingPath = notebook.name
        ? getNotebookPVCMountPathMap(allNotebooks.find((n) => n.metadata.name === notebook.name))[
            existingPvc?.metadata.name ?? ''
          ]
        : '';

      const error = validateClusterMountPath(newValue, inUseMountPaths);
      const isSamePvcPath = notebook.existingPvc && newValue === existingPath;

      const updatedData = [...notebookData];
      updatedData[rowIndex] = {
        ...notebook,
        mountPath: { value: newValue, error },
        isUpdatedValue: !isSamePvcPath,
      };

      setNotebookData(updatedData);
    },
    [notebookData, allNotebooks, existingPvc?.metadata.name, setNotebookData],
  );

  return (
    <Table
      data-testid="workbench-connection-table"
      variant="compact"
      columns={storageColumns}
      data={notebookData}
      rowRenderer={(row, rowIndex) => (
        <ClusterStorageTableRow
          key={row.newRowId || row.name}
          obj={row}
          inUseMountPaths={getInUseMountPaths(row.name, allNotebooks, existingPvc?.metadata.name)}
          availableNotebooks={{
            notebooks: [
              ...availableNotebooks,
              ...allNotebooks.filter((currentData) => currentData.metadata.name === row.name),
            ],
            loaded: notebookLoaded,
          }}
          onMountPathUpdate={(value, format) => handleMountPathUpdate(rowIndex, value, format)}
          onNotebookSelect={(notebookName) => {
            const updatedData = [...notebookData];
            updatedData[rowIndex] = {
              ...row,
              name: notebookName,
              mountPath: {
                ...row.mountPath,
                error: validateClusterMountPath(
                  row.mountPath.value,
                  getInUseMountPaths(notebookName, allNotebooks, existingPvc?.metadata.name),
                ),
              },
              existingPvc: connectedNotebooks.some((n) => n.metadata.name === notebookName),
            };
            setNotebookData(updatedData);
          }}
          onDelete={() => {
            const updatedData = [...notebookData];
            updatedData.splice(rowIndex, 1);
            setNotebookData(updatedData);
          }}
        />
      )}
    />
  );
};

export default ClusterStorageTable;
