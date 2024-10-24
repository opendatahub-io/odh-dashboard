import * as React from 'react';
import { NotebookKind, PersistentVolumeClaimKind } from '~/k8sTypes';
import { StorageData } from '~/pages/projects/types';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { attachNotebookPVC, createPvc, removeNotebookPVC, restartNotebook, updatePvc } from '~/api';
import {
  ConnectedNotebookContext,
  useRelatedNotebooks,
} from '~/pages/projects/notebook/useRelatedNotebooks';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import BaseStorageModal from './BaseStorageModal';

type ClusterStorageModalProps = {
  existingData?: PersistentVolumeClaimKind;
  onClose: (submit: boolean, storageData?: StorageData['creating']) => void;
};

const ClusterStorageModal: React.FC<ClusterStorageModalProps> = (props) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;

  const { notebooks: connectedNotebooks } = useRelatedNotebooks(
    ConnectedNotebookContext.EXISTING_PVC,
    props.existingData?.metadata.name,
  );

  const handleSubmit = async (
    storageData: StorageData['creating'],
    removedNotebooks: string[],
    attachNotebookName?: string,
    dryRun?: boolean,
  ) => {
    const promises: Promise<PersistentVolumeClaimKind | NotebookKind>[] = [];
    const { existingData } = props;

    if (existingData) {
      const pvcName = existingData.metadata.name;

      // Check if PVC needs to be updated (name, description, size, storageClass)
      if (
        getDisplayNameFromK8sResource(existingData) !== storageData.nameDesc.name ||
        getDescriptionFromK8sResource(existingData) !== storageData.nameDesc.description ||
        existingData.spec.resources.requests.storage !== storageData.size ||
        existingData.spec.storageClassName !== storageData.storageClassName
      ) {
        promises.push(updatePvc(storageData, existingData, namespace, { dryRun }));
      }

      // Restart notebooks if the PVC size has changed
      if (existingData.spec.resources.requests.storage !== storageData.size) {
        connectedNotebooks.map((connectedNotebook) =>
          promises.push(restartNotebook(connectedNotebook.metadata.name, namespace, { dryRun })),
        );
      }

      // Remove connections to notebooks that were removed
      if (removedNotebooks.length > 0) {
        promises.push(
          ...removedNotebooks.map((notebookName) =>
            removeNotebookPVC(notebookName, namespace, pvcName, { dryRun }),
          ),
        );
      }

      await Promise.all(promises);

      if (storageData.mountPath && attachNotebookName) {
        await attachNotebookPVC(attachNotebookName, namespace, pvcName, storageData.mountPath, {
          dryRun,
        });
      }
      return;
    }
    // Create new PVC if it doesn't exist
    const createdPvc = await createPvc(storageData, namespace, { dryRun });

    // Attach the new PVC to a notebook if specified
    if (storageData.mountPath && attachNotebookName) {
      await attachNotebookPVC(
        attachNotebookName,
        namespace,
        createdPvc.metadata.name,
        storageData.mountPath,
        { dryRun },
      );
    }
  };

  return (
    <BaseStorageModal
      {...props}
      onSubmit={handleSubmit}
      title={props.existingData ? 'Update cluster storage' : 'Add cluster storage'}
      description={
        props.existingData
          ? 'Make changes to cluster storage, or connect it to additional workspaces.'
          : 'Add storage and optionally connect it with an existing workbench.'
      }
      submitLabel={props.existingData ? 'Update' : 'Add storage'}
    />
  );
};

export default ClusterStorageModal;
