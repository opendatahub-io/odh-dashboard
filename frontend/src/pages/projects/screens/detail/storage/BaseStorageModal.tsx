import * as React from 'react';
import { Form, Modal, Stack, StackItem } from '@patternfly/react-core';
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
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import usePreferredStorageClass from '~/pages/projects/screens/spawner/storage/usePreferredStorageClass';
import useDefaultStorageClass from '~/pages/projects/screens/spawner/storage/useDefaultStorageClass';
import { CreatingStorageObject, StorageData } from '~/pages/projects/types';
import { getNotebookMountPaths } from '~/pages/projects/notebook/utils';
import SpawnerMountPathField from '~/pages/projects/screens/spawner/storage/SpawnerMountPathField';
import ExistingConnectedNotebooks from './ExistingConnectedNotebooks';

export type BaseStorageModalProps = {
  existingData?: PersistentVolumeClaimKind;
  onClose: (submit: boolean, storageData?: StorageData['creating']) => void;
  isSpawnerPage?: boolean;
  onSubmit: (
    storageData: StorageData['creating'],
    removedNotebooks: string[],
    notebookName?: string,
    dryRun?: boolean,
  ) => Promise<void>;
  submitLabel?: string;
  title?: string;
  description?: string;
};

const BaseStorageModal: React.FC<BaseStorageModalProps> = ({
  existingData,
  onClose,
  isSpawnerPage,
  onSubmit,
  submitLabel = 'Add storage',
  title = 'Add cluster storage',
  description = 'Add storage and optionally connect it with an existing workbench.',
}) => {
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const preferredStorageClass = usePreferredStorageClass();
  const [defaultStorageClass] = useDefaultStorageClass();
  const {
    notebooks: { data },
  } = React.useContext(ProjectDetailsContext);
  const notebooks = data.map(({ notebook }) => notebook);
  const [createData, setCreateData, resetData] = useCreateStorageObjectForNotebook(existingData);
  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const { notebooks: connectedNotebooks } = useRelatedNotebooks(
    ConnectedNotebookContext.EXISTING_PVC,
    existingData?.metadata.name,
  );
  const [removedNotebooks, setRemovedNotebooks] = React.useState<string[]>([]);
  const [notebookName, setNotebookName] = React.useState<string>();

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

  const onBeforeClose = (submitted: boolean, storageData?: StorageData['creating']) => {
    onClose(submitted, storageData);
    setActionInProgress(false);
    setRemovedNotebooks([]);
    setNotebookName(undefined);
    setError(undefined);
    resetData();
  };

  const hasValidNotebookRelationship = createData.forNotebook.name
    ? !!createData.forNotebook.mountPath.value && !createData.forNotebook.mountPath.error
    : true;

  const canCreate =
    !actionInProgress && createData.nameDesc.name.trim() && hasValidNotebookRelationship;

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    const storageData: CreatingStorageObject = {
      nameDesc: createData.nameDesc,
      size: createData.size,
      storageClassName: createData.storageClassName,
      mountPath: isSpawnerPage ? createData.mountPath : createData.forNotebook.mountPath.value,
    };

    onSubmit(storageData, removedNotebooks, notebookName, true)
      .then(() => onSubmit(storageData, removedNotebooks, notebookName, false))
      .then(() => onBeforeClose(true, storageData))
      .catch((e) => {
        setError(e);
        setActionInProgress(false);
      });
  };

  const inUseMountPaths = getNotebookMountPaths(
    notebooks.find((notebook) => notebook.metadata.name === createData.forNotebook.name),
  );

  return (
    <Modal
      title={title}
      description={description}
      variant="medium"
      isOpen
      onClose={() => onBeforeClose(false)}
      showClose
      footer={
        <DashboardModalFooter
          submitLabel={submitLabel}
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
          {isSpawnerPage ? (
            <StackItem>
              <SpawnerMountPathField
                isCreate
                inUseMountPaths={inUseMountPaths}
                mountPath={createData.mountPath ?? ''}
                onChange={(path) => setCreateData('mountPath', path)}
              />
            </StackItem>
          ) : (
            <>
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
                    setNotebookName(forNotebookData.name);
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
            </>
          )}
        </Stack>
      </Form>
    </Modal>
  );
};

export default BaseStorageModal;
