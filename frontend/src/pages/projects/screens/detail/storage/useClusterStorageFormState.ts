import React from 'react';
import { NotebookKind, PersistentVolumeClaimKind } from '#~/k8sTypes';
import { getNotebookPVCMountPathMap } from '#~/pages/projects/notebook/utils';
import { ClusterStorageNotebookSelection } from '#~/pages/projects/types';

const useClusterStorageFormState = (
  connectedNotebooks: NotebookKind[],
  existingPvc?: PersistentVolumeClaimKind,
): {
  notebookData: ClusterStorageNotebookSelection[];
  setNotebookData: React.Dispatch<React.SetStateAction<ClusterStorageNotebookSelection[]>>;
} => {
  const [notebookData, setNotebookData] = React.useState<ClusterStorageNotebookSelection[]>([]);

  React.useEffect(() => {
    if (connectedNotebooks.length > 0) {
      const addData = connectedNotebooks.map((connectedNotebook) => ({
        name: connectedNotebook.metadata.name,
        notebookDisplayName: connectedNotebook.metadata.annotations?.['openshift.io/display-name'],
        mountPath: {
          value: existingPvc
            ? getNotebookPVCMountPathMap(connectedNotebook)[existingPvc.metadata.name]
            : '',
          error: '',
        },
        existingPvc: true,
        isUpdatedValue: false,
      }));
      setNotebookData(addData);
    }
  }, [connectedNotebooks, existingPvc]);

  return { notebookData, setNotebookData };
};

export default useClusterStorageFormState;
