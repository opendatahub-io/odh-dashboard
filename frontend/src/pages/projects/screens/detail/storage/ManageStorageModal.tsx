import * as React from 'react';
import { Form, Modal, Stack, StackItem } from '@patternfly/react-core';
import { attachNotebookPVC, createPvc, removeNotebookPVC, restartNotebook, updatePvc } from '~/api';
import { NotebookKind, PersistentVolumeClaimKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useCreateStorageObjectForNotebook } from '~/pages/projects/screens/spawner/storage/utils';
import CreateNewStorageSection from '~/pages/projects/screens/spawner/storage/CreateNewStorageSection';
import StorageNotebookConnections from '~/pages/projects/notebook/StorageNotebookConnections';
import {
  useRelatedNotebooks,
  ConnectedNotebookContext,
} from '~/pages/projects/notebook/useRelatedNotebooks';
import NotebookRestartAlert from '~/pages/projects/components/NotebookRestartAlert';
import useWillNotebooksRestart from '~/pages/projects/notebook/useWillNotebooksRestart';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import usePreferredStorageClass from '~/pages/projects/screens/spawner/storage/usePreferredStorageClass';
import useDefaultStorageClass from '~/pages/projects/screens/spawner/storage/useDefaultStorageClass';
import ExistingConnectedNotebooks from './ExistingConnectedNotebooks';

type AddStorageModalProps = {
  existingData?: PersistentVolumeClaimKind;
  onClose: (submit: boolean) => void;
};

const ManageStorageModal: React.FC<AddStorageModalProps> = ({ existingData, onClose }) => {
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const preferredStorageClass = usePreferredStorageClass();
  const [defaultStorageClass] = useDefaultStorageClass();

  const [createData, setCreateData, resetData] = useCreateStorageObjectForNotebook(existingData);
  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;
  const { notebooks: connectedNotebooks } = useRelatedNotebooks(
    ConnectedNotebookContext.EXISTING_PVC,
    existingData?.metadata.name,
  );
  const [removedNotebooks, setRemovedNotebooks] = React.useState<string[]>([]);

  const {
    notebooks: removableNotebooks,
    loaded: removableNotebookLoaded,
    error: removableNotebookError,
  } = useRelatedNotebooks(ConnectedNotebookContext.REMOVABLE_PVC, existingData?.metadata.name);

  const restartNotebooks = useWillNotebooksRestart([
    ...removedNotebooks,
    createData.forNotebook.name,
  ]);

  React.useEffect(() => {
    if (!existingData) {
      if (isStorageClassesAvailable) {
        setCreateData('storageClassName', defaultStorageClass?.metadata.name);
      } else {
        setCreateData('storageClassName', preferredStorageClass?.metadata.name);
      }
    }
  }, [
    isStorageClassesAvailable,
    defaultStorageClass,
    preferredStorageClass,
    existingData,
    setCreateData,
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
        existingData.spec.resources.requests.storage !== createData.size ||
        existingData.spec.storageClassName !== createData.storageClassName
      ) {
        pvcPromises.push(updatePvc(createData, existingData, namespace, { dryRun }));
      }
      if (existingData.spec.resources.requests.storage !== createData.size) {
        connectedNotebooks.map((connectedNotebook) =>
          pvcPromises.push(restartNotebook(connectedNotebook.metadata.name, namespace, { dryRun })),
        );
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
    const createdPvc = await createPvc(createData, namespace, { dryRun });
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
      isOpen
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
              setData={setCreateData}
              currentSize={existingData?.status?.capacity?.storage}
              autoFocusName
              disableStorageClassSelect={!!existingData}
            />
          </StackItem>
          {createData.hasExistingNotebookConnections && (
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
                setCreateData('forNotebook', forNotebookData);
              }}
              forNotebookData={createData.forNotebook}
              connectedNotebooks={connectedNotebooks}
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
