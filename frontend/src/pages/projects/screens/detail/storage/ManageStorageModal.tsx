import * as React from 'react';
import { Form, Modal, Stack, StackItem } from '@patternfly/react-core';
import { attachNotebookPVC, createPvc, removeNotebookPVC, updatePvc } from '~/api';
import { NotebookKind, PersistentVolumeClaimKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useCreateStorageObjectForNotebook } from '~/pages/projects/screens/spawner/storage/utils';
import CreateNewStorageSection from '~/pages/projects/screens/spawner/storage/CreateNewStorageSection';
import StorageNotebookConnections from '~/pages/projects/notebook/StorageNotebookConnections';
import useRelatedNotebooks, {
  ConnectedNotebookContext,
} from '~/pages/projects/notebook/useRelatedNotebooks';
import NotebookRestartAlert from '~/pages/projects/components/NotebookRestartAlert';
import useWillNotebooksRestart from '~/pages/projects/notebook/useWillNotebooksRestart';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import usePreferredStorageClass from '~/pages/projects/screens/spawner/storage/usePreferredStorageClass';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
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

  const storageClass = usePreferredStorageClass();

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

  const runPromiseActions = async (dryRun: boolean) => {
    const {
      forNotebook: { name: notebookName, mountPath },
    } = createData;
    const pvcPromises: Promise<PersistentVolumeClaimKind | NotebookKind>[] = [];
    if (existingData) {
      const pvcName = existingData.metadata.name;
      if (
        getDisplayNameFromK8sResource(existingData) !== createData.nameDesc.name ||
        getDescriptionFromK8sResource(existingData) !== createData.nameDesc.description ||
        existingData.spec.resources.requests.storage !== createData.size
      ) {
        pvcPromises.push(updatePvc(createData, existingData, namespace, { dryRun }));
      }
      if (removedNotebooks.length > 0) {
        // Remove connected pvcs
        pvcPromises.push(
          ...removedNotebooks.map((currentNotebookName) =>
            removeNotebookPVC(currentNotebookName, namespace, pvcName, { dryRun }),
          ),
        );
      }

      await Promise.all(pvcPromises);
      if (notebookName) {
        await attachNotebookPVC(notebookName, namespace, pvcName, mountPath.value, {
          dryRun,
        });
      }
      return;
    }
    const createdPvc = await createPvc(createData, namespace, storageClass?.metadata.name, {
      dryRun,
    });
    if (notebookName) {
      await attachNotebookPVC(notebookName, namespace, createdPvc.metadata.name, mountPath.value, {
        dryRun,
      });
    }
  };

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    runPromiseActions(true)
      .then(() => runPromiseActions(false).then(() => onBeforeClose(true)))
      .catch((e) => {
        setError(e);
        setActionInProgress(false);
      });
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
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Stack hasGutter>
          <StackItem>
            <CreateNewStorageSection
              data={createData}
              setData={(key, value) => setCreateData(key, value)}
              currentSize={existingData?.status?.capacity?.storage}
              autoFocusName
            />
          </StackItem>
          {createData.hasExistingNotebookConnections && (
            <StackItem>
              <ExistingConnectedNotebooks
                connectedNotebooks={connectedNotebooks}
                onNotebookRemove={(notebook: NotebookKind) =>
                  setRemovedNotebooks([...removedNotebooks, notebook.metadata.name])
                }
                loaded={notebookLoaded}
                error={notebookError}
              />
            </StackItem>
          )}
          <StackItem>
            <StorageNotebookConnections
              setForNotebookData={(forNotebookData) => {
                setCreateData('forNotebook', forNotebookData);
              }}
              forNotebookData={createData.forNotebook}
              isDisabled={connectedNotebooks.length !== 0 && removedNotebooks.length === 0}
            />
          </StackItem>
          {restartNotebooks.length !== 0 && (
            <StackItem>
              <NotebookRestartAlert notebooks={restartNotebooks} />
            </StackItem>
          )}
        </Stack>
      </Form>
    </Modal>
  );
};

export default ManageStorageModal;
