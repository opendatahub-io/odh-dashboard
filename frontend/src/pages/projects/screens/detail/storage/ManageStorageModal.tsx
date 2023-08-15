import * as React from 'react';
import { Form, Modal, Stack, StackItem } from '@patternfly/react-core';
import {
  assemblePvc,
  attachNotebookPVC,
  createPvc,
  removeNotebookPVC,
  updatePvcDescription,
  updatePvcDisplayName,
  updatePvcSize,
} from '~/api';
import { NotebookKind, PersistentVolumeClaimKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useCreateStorageObjectForNotebook } from '~/pages/projects/screens/spawner/storage/utils';
import CreateNewStorageSection from '~/pages/projects/screens/spawner/storage/CreateNewStorageSection';
import StorageNotebookConnections from '~/pages/projects/notebook/StorageNotebookConnections';
import useRelatedNotebooks, {
  ConnectedNotebookContext,
} from '~/pages/projects/notebook/useRelatedNotebooks';
import { getPvcDescription, getPvcDisplayName, getPvcTotalSize } from '~/pages/projects/utils';
import NotebookRestartAlert from '~/pages/projects/components/NotebookRestartAlert';
import useWillNotebooksRestart from '~/pages/projects/notebook/useWillNotebooksRestart';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import ExistingConnectedNotebooks from './ExistingConnectedNotebooks';

type AddStorageModalProps = {
  existingData?: PersistentVolumeClaimKind;
  isOpen: boolean;
  onClose: (submit: boolean) => void;
};

const ManageStorageModal: React.FC<AddStorageModalProps> = ({ existingData, isOpen, onClose }) => {
  const [createData, setCreateData, resetData] = useCreateStorageObjectForNotebook(existingData);
  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;
  const {
    notebooks: connectedNotebooks,
    loaded: notebookLoaded,
    error: notebookError,
  } = useRelatedNotebooks(ConnectedNotebookContext.EXISTING_PVC, existingData?.metadata.name);
  const [removedNotebooks, setRemovedNotebooks] = React.useState<string[]>([]);

  const restartNotebooks = useWillNotebooksRestart([
    ...removedNotebooks,
    createData.forNotebook.name,
  ]);

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setActionInProgress(false);
    setRemovedNotebooks([]);
    setError(undefined);
    resetData();
  };

  const hasValidNotebookRelationship = createData.forNotebook.name
    ? !!createData.forNotebook.mountPath.value && !createData.forNotebook.mountPath.error
    : true;
  const canCreate =
    !actionInProgress && createData.nameDesc.name.trim() && hasValidNotebookRelationship;

  const handleError = (e: Error) => {
    setError(e);
    setActionInProgress(false);
  };

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    const {
      nameDesc: { name, description },
      size,
      forNotebook: { name: notebookName, mountPath },
    } = createData;

    const pvc = assemblePvc(name, namespace, description, size);

    if (existingData) {
      const pvcName = existingData.metadata.name;
      const pvcPromises: Promise<PersistentVolumeClaimKind | NotebookKind>[] = [];
      if (getPvcDisplayName(existingData) !== createData.nameDesc.name) {
        pvcPromises.push(updatePvcDisplayName(pvcName, namespace, createData.nameDesc.name));
      }
      if (getPvcDescription(existingData) !== createData.nameDesc.description) {
        pvcPromises.push(updatePvcDescription(pvcName, namespace, createData.nameDesc.description));
      }
      if (parseInt(getPvcTotalSize(existingData)) !== createData.size) {
        pvcPromises.push(updatePvcSize(pvcName, namespace, `${createData.size}Gi`));
      }
      if (removedNotebooks.length > 0) {
        // Remove connected pvcs
        pvcPromises.push(
          ...removedNotebooks.map((notebookName) =>
            removeNotebookPVC(notebookName, namespace, pvcName),
          ),
        );
      }
      Promise.all(pvcPromises)
        .then(() => {
          if (notebookName) {
            pvcPromises.push(attachNotebookPVC(notebookName, namespace, pvcName, mountPath.value));
          }
        })
        .then(() => onBeforeClose(true))
        .catch(handleError);
    } else {
      createPvc(pvc)
        .then((createdPvc) => {
          if (notebookName) {
            attachNotebookPVC(notebookName, namespace, createdPvc.metadata.name, mountPath.value);
          }
        })
        .then(() => onBeforeClose(true))
        .catch(handleError);
    }
  };

  return (
    <Modal
      title={existingData ? 'Update cluster storage' : 'Add cluster storage'}
      description={
        existingData
          ? 'Make changes to cluster storage, or connect it to additional workspaces.'
          : 'Add storage and optionally connect it with an existing workbench.'
      }
      variant="medium"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      showClose
      footer={
        <DashboardModalFooter
          submitLabel={existingData ? 'Update' : 'Add storage'}
          onSubmit={submit}
          onCancel={() => onBeforeClose(false)}
          isSubmitDisabled={!canCreate}
          error={error}
          alertTitle="Error creating storage"
        />
      }
    >
      <Stack hasGutter>
        <StackItem>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <CreateNewStorageSection
              data={createData}
              setData={(key, value) => setCreateData(key, value)}
              currentSize={existingData?.status?.capacity?.storage}
              autoFocusName
            />
            {createData.hasExistingNotebookConnections && (
              <ExistingConnectedNotebooks
                connectedNotebooks={connectedNotebooks}
                onNotebookRemove={(notebook: NotebookKind) =>
                  setRemovedNotebooks([...removedNotebooks, notebook.metadata.name])
                }
                loaded={notebookLoaded}
                error={notebookError}
              />
            )}
            <StorageNotebookConnections
              setForNotebookData={(forNotebookData) => {
                setCreateData('forNotebook', forNotebookData);
              }}
              forNotebookData={createData.forNotebook}
              isDisabled={connectedNotebooks.length !== 0 && removedNotebooks.length === 0}
            />
          </Form>
        </StackItem>
        {restartNotebooks.length !== 0 && (
          <StackItem>
            <NotebookRestartAlert notebooks={restartNotebooks} />
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};

export default ManageStorageModal;
