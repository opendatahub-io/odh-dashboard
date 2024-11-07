import * as React from 'react';
import { StackItem } from '@patternfly/react-core';
import { NotebookKind, PersistentVolumeClaimKind } from '~/k8sTypes';
import { CreatingStorageObject, ForNotebookSelection, StorageData } from '~/pages/projects/types';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { attachNotebookPVC, createPvc, removeNotebookPVC, restartNotebook, updatePvc } from '~/api';
import {
  ConnectedNotebookContext,
  useRelatedNotebooks,
} from '~/pages/projects/notebook/useRelatedNotebooks';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import NotebookRestartAlert from '~/pages/projects/components/NotebookRestartAlert';
import StorageNotebookConnections from '~/pages/projects/notebook/StorageNotebookConnections';
import useWillNotebooksRestart from '~/pages/projects/notebook/useWillNotebooksRestart';
import BaseStorageModal from './BaseStorageModal';
import ExistingConnectedNotebooks from './ExistingConnectedNotebooks';

type ClusterStorageModalProps = {
  existingData?: PersistentVolumeClaimKind;
  onClose: (submit: boolean) => void;
};

const ClusterStorageModal: React.FC<ClusterStorageModalProps> = (props) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;
  const [removedNotebooks, setRemovedNotebooks] = React.useState<string[]>([]);
  const [notebookData, setNotebookData] = React.useState<ForNotebookSelection>({
    name: '',
    mountPath: { value: '', error: '' },
  });
  const { notebooks: connectedNotebooks } = useRelatedNotebooks(
    ConnectedNotebookContext.EXISTING_PVC,
    props.existingData?.metadata.name,
  );
  const { notebooks: relatedNotebooks } = useRelatedNotebooks(
    ConnectedNotebookContext.REMOVABLE_PVC,
    props.existingData?.metadata.name,
  );

  const hasExistingNotebookConnections = relatedNotebooks.length > 0;

  const {
    notebooks: removableNotebooks,
    loaded: removableNotebookLoaded,
    error: removableNotebookError,
  } = useRelatedNotebooks(
    ConnectedNotebookContext.REMOVABLE_PVC,
    props.existingData?.metadata.name,
  );

  const restartNotebooks = useWillNotebooksRestart([...removedNotebooks, notebookData.name]);

  const handleSubmit = async (
    storageData: StorageData['creating'],
    attachNotebookData?: ForNotebookSelection,
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
          ...removedNotebooks.map((nM) => removeNotebookPVC(nM, namespace, pvcName, { dryRun })),
        );
      }

      await Promise.all(promises);

      if (attachNotebookData?.name) {
        await attachNotebookPVC(
          attachNotebookData.name,
          namespace,
          pvcName,
          attachNotebookData.mountPath.value,
          {
            dryRun,
          },
        );
      }
      return;
    }
    // Create new PVC if it doesn't exist
    const createdPvc = await createPvc(storageData, namespace, { dryRun });

    // Attach the new PVC to a notebook if specified
    if (attachNotebookData?.name) {
      await attachNotebookPVC(
        attachNotebookData.name,
        namespace,
        createdPvc.metadata.name,
        attachNotebookData.mountPath.value,
        { dryRun },
      );
    }
  };

  const submit = async (data: CreatingStorageObject) => {
    const storageData: CreatingStorageObject = {
      nameDesc: data.nameDesc,
      size: data.size,
      storageClassName: data.storageClassName,
    };

    return handleSubmit(storageData, notebookData, true).then(() =>
      handleSubmit(storageData, notebookData, false),
    );
  };

  const hasValidNotebookRelationship = notebookData.name
    ? !!notebookData.mountPath.value && !notebookData.mountPath.error
    : true;

  const isValid = hasValidNotebookRelationship;

  return (
    <BaseStorageModal
      {...props}
      onSubmit={(data) => submit(data)}
      title={props.existingData ? 'Update cluster storage' : 'Add cluster storage'}
      description={
        props.existingData
          ? 'Make changes to cluster storage, or connect it to additional workspaces.'
          : 'Add storage and optionally connect it with an existing workbench.'
      }
      submitLabel={props.existingData ? 'Update' : 'Add storage'}
      isValid={isValid}
      onClose={(submitted) => props.onClose(submitted)}
    >
      <>
        {hasExistingNotebookConnections && (
          <StackItem>
            <ExistingConnectedNotebooks
              connectedNotebooks={removableNotebooks}
              onNotebookRemove={(notebook: NotebookKind) =>
                setRemovedNotebooks([...removedNotebooks, notebook.metadata.name])
              }
              loaded={removableNotebookLoaded}
              error={removableNotebookError}
            />
          </StackItem>
        )}
        <StackItem>
          <StorageNotebookConnections
            setForNotebookData={(forNotebookData) => {
              setNotebookData(forNotebookData);
            }}
            forNotebookData={notebookData}
            connectedNotebooks={connectedNotebooks}
          />
        </StackItem>
        {restartNotebooks.length !== 0 && (
          <StackItem>
            <NotebookRestartAlert notebooks={restartNotebooks} />
          </StackItem>
        )}
      </>
    </BaseStorageModal>
  );
};

export default ClusterStorageModal;
