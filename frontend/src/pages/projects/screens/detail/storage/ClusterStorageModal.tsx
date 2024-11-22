import * as React from 'react';
import { Button, Stack, FormGroup, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { NotebookKind, PersistentVolumeClaimKind } from '~/k8sTypes';
import { ClusterStorageNotebookSelection, MountPath, StorageData } from '~/pages/projects/types';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import {
  attachNotebookPVC,
  createPvc,
  removeNotebookPVC,
  restartNotebook,
  updateNotebookPVC,
  updatePvc,
} from '~/api';
import {
  ConnectedNotebookContext,
  useRelatedNotebooks,
} from '~/pages/projects/notebook/useRelatedNotebooks';
import useWillNotebooksRestart from '~/pages/projects/notebook/useWillNotebooksRestart';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import { Table } from '~/components/table';
import { getNotebookPVCMountPathMap } from '~/pages/projects/notebook/utils';
import { MOUNT_PATH_PREFIX } from '~/pages/projects/screens/spawner/storage/const';
import NotebookRestartAlert from '~/pages/projects/components/NotebookRestartAlert';
import BaseStorageModal from './BaseStorageModal';
import { handleConnectedNotebooks, isPvcUpdateRequired } from './utils';
import { storageColumns } from './clusterTableColumns';
import ClusterStorageTableRow from './ClusterStorageTableRow';

type ClusterStorageModalProps = {
  existingPvc?: PersistentVolumeClaimKind;
  onClose: (submit: boolean) => void;
};

const ClusterStorageModal: React.FC<ClusterStorageModalProps> = ({ existingPvc, onClose }) => {
  const {
    currentProject,
    notebooks: { data, loaded },
  } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;
  const allNotebooks = data.map((currentData) => currentData.notebook);
  const { notebooks: connectedNotebooks } = useRelatedNotebooks(
    ConnectedNotebookContext.REMOVABLE_PVC,
    existingPvc?.metadata.name,
  );

  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;

  const hasExistingNotebookConnections = connectedNotebooks.length > 0;
  const [notebookData, setNotebookData] = React.useState<ClusterStorageNotebookSelection[]>([]);
  const [newRowId, setNewRowId] = React.useState<number>(1);

  React.useEffect(() => {
    if (hasExistingNotebookConnections) {
      const addData = connectedNotebooks.map((connectedNotebook) => ({
        name: connectedNotebook.metadata.name,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPvc, hasExistingNotebookConnections]);

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

  const addEmptyRow = React.useCallback(() => {
    setNotebookData(() => [
      ...notebookData,
      {
        name: '',
        mountPath: {
          value: MOUNT_PATH_PREFIX,
          error: '',
        },
        existingPvc: false,
        isUpdatedValue: false,
        newRowId,
      },
    ]);
    setNewRowId((prev) => prev + 1);
  }, [newRowId, notebookData]);

  const { updatedNotebooks, removedNotebooks } = handleConnectedNotebooks(
    notebookData,
    connectedNotebooks,
  );

  const newNotebooks = notebookData.filter((notebook) => !notebook.existingPvc);

  const restartNotebooks = useWillNotebooksRestart([
    ...updatedNotebooks.map((updatedNotebook) => updatedNotebook.name),
    ...removedNotebooks,
    ...newNotebooks.map((newNotebook) => newNotebook.name),
  ]);

  const handleSubmit = async (storageData: StorageData, dryRun?: boolean) => {
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

      if (updatedNotebooks.length > 0) {
        promises.push(
          ...updatedNotebooks.map((nM) =>
            updateNotebookPVC(nM.name, namespace, nM.mountPath.value, pvcName, { dryRun }),
          ),
        );
      }

      if (removedNotebooks.length > 0) {
        promises.push(
          ...removedNotebooks.map((nM) => removeNotebookPVC(nM, namespace, pvcName, { dryRun })),
        );
      }
      if (newNotebooks.length > 0) {
        promises.push(
          ...newNotebooks.map((nM) =>
            attachNotebookPVC(nM.name, namespace, pvcName, nM.mountPath.value, { dryRun }),
          ),
        );
      }
      await Promise.all(promises);
      return;
    }

    // Create new PVC if it doesn't exist
    const createdPvc = await createPvc(storageData, namespace, { dryRun });

    const newCreatedPVCPromises: Promise<PersistentVolumeClaimKind | NotebookKind>[] = [];
    // Attach the new PVC to a notebook if specified

    if (newNotebooks.length > 0) {
      newCreatedPVCPromises.push(
        ...newNotebooks.map((nM) =>
          attachNotebookPVC(nM.name, namespace, createdPvc.metadata.name, nM.mountPath.value, {
            dryRun,
          }),
        ),
      );
    }
    await Promise.all(newCreatedPVCPromises);
  };

  const addNotebookData = React.useCallback(
    (
      rowIndex: number,
      notebookName?: string,
      mountPath?: MountPath,
      isUpdatedValue?: boolean,
      updatedExistingPvc?: boolean,
    ) => {
      const copiedArray = [...notebookData];
      if (notebookName) {
        copiedArray[rowIndex].name = notebookName;
      }
      if (isUpdatedValue !== undefined) {
        copiedArray[rowIndex].isUpdatedValue = isUpdatedValue;
      }

      if (updatedExistingPvc) {
        copiedArray[rowIndex].existingPvc = updatedExistingPvc;
      }
      if (mountPath) {
        copiedArray[rowIndex].mountPath = mountPath;
      }

      setNotebookData(copiedArray);
    },
    [notebookData],
  );

  const submit = async (dataSubmit: StorageData) =>
    handleSubmit(dataSubmit, true).then(() => handleSubmit(dataSubmit, false));

  const hasAllValidNotebookRelationship = React.useMemo(
    () =>
      notebookData.every((currentNotebookData) =>
        currentNotebookData.name
          ? !!currentNotebookData.mountPath.value && !currentNotebookData.mountPath.error
          : false,
      ),
    [notebookData],
  );

  const isValid = hasAllValidNotebookRelationship;

  return (
    <BaseStorageModal
      onSubmit={(dataSubmit) => submit(dataSubmit)}
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
      {(name) => (
        <>
          {workbenchEnabled && (
            <FormGroup label="Workbench connections" fieldId="workbench-connections">
              <Stack hasGutter>
                <StackItem>
                  <Table
                    data-testid="workbench-connection-table"
                    variant="compact"
                    columns={storageColumns}
                    data={notebookData}
                    rowRenderer={(row, rowIndex) => (
                      <ClusterStorageTableRow
                        clusterStorageName={name}
                        existingPvc={existingPvc}
                        connectedNotebooks={connectedNotebooks}
                        key={rowIndex}
                        obj={row}
                        availableNotebooks={{
                          notebooks: [
                            ...availableNotebooks,
                            ...allNotebooks.filter(
                              (currentData) => currentData.metadata.name === row.name,
                            ),
                          ],
                          loaded,
                        }}
                        addNotebookData={(
                          notebookName?: string,
                          mountPath?: MountPath,
                          isUpdatedValue?: boolean,
                          updatedExistingPvc?: boolean,
                        ) =>
                          addNotebookData(
                            rowIndex,
                            notebookName,
                            mountPath,
                            isUpdatedValue,
                            updatedExistingPvc,
                          )
                        }
                        onDelete={() => {
                          const copiedArray = [...notebookData];
                          copiedArray.splice(rowIndex, 1);
                          setNotebookData(copiedArray);
                        }}
                      />
                    )}
                  />
                </StackItem>
                <StackItem>
                  <Button
                    data-testid="add-workbench-button"
                    variant="link"
                    icon={<PlusCircleIcon />}
                    onClick={addEmptyRow}
                    isInline
                  >
                    Add Workbench
                  </Button>
                </StackItem>
                <StackItem>
                  {restartNotebooks.length !== 0 && (
                    <NotebookRestartAlert notebooks={restartNotebooks} />
                  )}
                </StackItem>
              </Stack>
            </FormGroup>
          )}
        </>
      )}
    </BaseStorageModal>
  );
};

export default ClusterStorageModal;
