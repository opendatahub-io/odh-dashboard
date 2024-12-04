import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
import { NotebookKind, PersistentVolumeClaimKind } from '~/k8sTypes';
import { ForNotebookSelection, StorageData } from '~/pages/projects/types';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { attachNotebookPVC, createPvc, removeNotebookPVC, restartNotebook, updatePvc } from '~/api';
import {
  ConnectedNotebookContext,
  useRelatedNotebooks,
} from '~/pages/projects/notebook/useRelatedNotebooks';
import NotebookRestartAlert from '~/pages/projects/components/NotebookRestartAlert';
import StorageNotebookConnections from '~/pages/projects/notebook/StorageNotebookConnections';
import useWillNotebooksRestart from '~/pages/projects/notebook/useWillNotebooksRestart';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import BaseStorageModal from './BaseStorageModal';
import ExistingConnectedNotebooks from './ExistingConnectedNotebooks';
import { isPvcUpdateRequired } from './utils';

type ClusterStorageModalProps = {
  existingPvc?: PersistentVolumeClaimKind;
  onClose: (submit: boolean) => void;
};

const ClusterStorageModal: React.FC<ClusterStorageModalProps> = ({ existingPvc, onClose }) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;
  const [removedNotebooks, setRemovedNotebooks] = React.useState<string[]>([]);
  const [notebookData, setNotebookData] = React.useState<ForNotebookSelection>({
    name: '',
    mountPath: { value: '', error: '' },
  });
  const { notebooks: connectedNotebooks } = useRelatedNotebooks(
    ConnectedNotebookContext.EXISTING_PVC,
    existingPvc?.metadata.name,
  );

  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;

  const {
    notebooks: removableNotebooks,
    loaded: removableNotebookLoaded,
    error: removableNotebookError,
  } = useRelatedNotebooks(ConnectedNotebookContext.REMOVABLE_PVC, existingPvc?.metadata.name);

  const hasExistingNotebookConnections = removableNotebooks.length > 0;

  const restartNotebooks = useWillNotebooksRestart([...removedNotebooks, notebookData.name]);

  const handleSubmit = async (
    storageData: StorageData,
    attachNotebookData?: ForNotebookSelection,
    dryRun?: boolean,
  ) => {
    const promises: Promise<PersistentVolumeClaimKind | NotebookKind>[] = [];

    if (existingPvc) {
      const pvcName = existingPvc.metadata.name;

      // Check if PVC needs to be updated (name, description, size, storageClass)
      if (isPvcUpdateRequired(existingPvc, storageData)) {
        promises.push(updatePvc(storageData, existingPvc, namespace, { dryRun }));
      }

      // Restart notebooks if the PVC size has changed
      if (existingPvc.spec.resources.requests.storage !== storageData.size) {
        restartNotebooks.map((connectedNotebook) =>
          promises.push(
            restartNotebook(connectedNotebook.notebook.metadata.name, namespace, { dryRun }),
          ),
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

  const submit = async (data: StorageData) =>
    handleSubmit(data, notebookData, true).then(() => handleSubmit(data, notebookData, false));

  const hasValidNotebookRelationship = notebookData.name
    ? !!notebookData.mountPath.value && !notebookData.mountPath.error
    : true;

  const isValid = hasValidNotebookRelationship;

  return (
    <BaseStorageModal
      onSubmit={(data) => submit(data)}
      title={existingPvc ? 'Update cluster storage' : 'Add cluster storage'}
      description={
        existingPvc
          ? 'Make changes to cluster storage, or connect it to additional workspaces.'
          : 'Add storage and optionally connect it with an existing workbench.'
      }
      submitLabel={existingPvc ? 'Update' : 'Add storage'}
      isValid={isValid}
      onClose={(submitted) => onClose(submitted)}
      existingPvc={existingPvc}
    >
      {workbenchEnabled && (
        <>
          {hasExistingNotebookConnections && (
            <ExistingConnectedNotebooks
              connectedNotebooks={removableNotebooks}
              onNotebookRemove={(notebook: NotebookKind) =>
                setRemovedNotebooks([...removedNotebooks, notebook.metadata.name])
              }
              loaded={removableNotebookLoaded}
              error={removableNotebookError}
            />
          )}
          <StorageNotebookConnections
            setForNotebookData={(forNotebookData) => {
              setNotebookData(forNotebookData);
            }}
            forNotebookData={notebookData}
            connectedNotebooks={connectedNotebooks}
          />
          {restartNotebooks.length !== 0 && (
            <FormGroup>
              <NotebookRestartAlert notebooks={restartNotebooks} />
            </FormGroup>
          )}
        </>
      )}
    </BaseStorageModal>
  );
};

export default ClusterStorageModal;
