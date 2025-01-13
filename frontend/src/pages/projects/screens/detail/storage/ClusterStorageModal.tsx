import * as React from 'react';
import { Button, Stack, FormGroup, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { isEqual } from 'lodash-es';
import { NotebookKind, PersistentVolumeClaimKind } from '~/k8sTypes';
import { ClusterStorageNotebookSelection, StorageData } from '~/pages/projects/types';
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
import { MountPathFormat } from '~/pages/projects/screens/spawner/storage/types';
import { useCreateStorageObject } from '~/pages/projects/screens/spawner/storage/utils';
import BaseStorageModal from './BaseStorageModal';
import {
  handleConnectedNotebooks,
  isPvcUpdateRequired,
  getInUseMountPaths,
  validateClusterMountPath,
  getDefaultMountPathFromStorageName,
} from './utils';
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
  const allNotebooks = React.useMemo(() => data.map((currentData) => currentData.notebook), [data]);
  const { notebooks: connectedNotebooks } = useRelatedNotebooks(
    ConnectedNotebookContext.REMOVABLE_PVC,
    existingPvc?.metadata.name,
  );

  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;
  const [{ name }] = useCreateStorageObject(existingPvc);
  const [storageName, setStorageName] = React.useState<string>(name);
  const hasExistingNotebookConnections = connectedNotebooks.length > 0;
  const [notebookData, setNotebookData] = React.useState<ClusterStorageNotebookSelection[]>([]);
  const [newRowId, setNewRowId] = React.useState<number>(1);

  React.useEffect(() => {
    if (hasExistingNotebookConnections) {
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
          value: getDefaultMountPathFromStorageName(storageName, newRowId),
          error: '',
        },
        existingPvc: false,
        isUpdatedValue: false,
        newRowId,
      },
    ]);
    setNewRowId((prev) => prev + 1);
  }, [newRowId, notebookData, storageName]);

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

  const handleSubmit = async (submitData: StorageData, dryRun?: boolean) => {
    const promises: Promise<PersistentVolumeClaimKind | NotebookKind>[] = [];
    if (existingPvc) {
      const pvcName = existingPvc.metadata.name;

      // Check if PVC needs to be updated (name, description, size, storageClass)
      if (isPvcUpdateRequired(existingPvc, submitData)) {
        promises.push(updatePvc(submitData, existingPvc, namespace, { dryRun }));
      }

      // Restart notebooks if the PVC size has changed
      if (existingPvc.spec.resources.requests.storage !== submitData.size) {
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

    const createdPvc = await createPvc(submitData, namespace, { dryRun });

    const newCreatedPVCPromises: Promise<PersistentVolumeClaimKind | NotebookKind>[] = [];

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

  const updatePathWithNameChange = React.useCallback(
    (newStorageName: string) => {
      const updatedData = notebookData.map((notebook) => {
        if (!notebook.existingPvc && !notebook.isUpdatedValue) {
          const defaultPathValue = getDefaultMountPathFromStorageName(
            newStorageName,
            notebook.newRowId,
          );

          const inUseMountPaths = getInUseMountPaths(
            notebook.name,
            allNotebooks,
            existingPvc?.metadata.name,
          );

          return {
            ...notebook,
            mountPath: {
              value: defaultPathValue,
              error: validateClusterMountPath(defaultPathValue, inUseMountPaths),
            },
          };
        }
        return notebook;
      });

      if (!isEqual(updatedData, notebookData)) {
        setNotebookData(updatedData);
      }
    },
    [allNotebooks, existingPvc?.metadata.name, notebookData],
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
    [notebookData, allNotebooks, existingPvc],
  );

  return (
    <BaseStorageModal
      onSubmit={(dataSubmit) => submit(dataSubmit)}
      title={existingPvc ? 'Update cluster storage' : 'Add cluster storage'}
      description={
        existingPvc
          ? 'Make changes to cluster storage, or connect it to additional workspaces.'
          : 'Add storage and optionally connect it with an existing workbench.'
      }
      onNameChange={(currentName) => {
        setStorageName(currentName);
        updatePathWithNameChange(currentName);
      }}
      submitLabel={existingPvc ? 'Update' : 'Add storage'}
      isValid={isValid}
      onClose={(submitted) => onClose(submitted)}
      existingPvc={existingPvc}
    >
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
                      key={row.newRowId || row.name}
                      obj={row}
                      inUseMountPaths={getInUseMountPaths(
                        row.name,
                        allNotebooks,
                        existingPvc?.metadata.name,
                      )}
                      availableNotebooks={{
                        notebooks: [
                          ...availableNotebooks,
                          ...allNotebooks.filter(
                            (currentData) => currentData.metadata.name === row.name,
                          ),
                        ],
                        loaded,
                      }}
                      onMountPathUpdate={(value, format) =>
                        handleMountPathUpdate(rowIndex, value, format)
                      }
                      onNotebookSelect={(notebookName) => {
                        const updatedData = [...notebookData];
                        updatedData[rowIndex] = {
                          ...row,
                          name: notebookName,
                          mountPath: {
                            ...row.mountPath,
                            error: validateClusterMountPath(
                              row.mountPath.value,
                              getInUseMountPaths(
                                notebookName,
                                allNotebooks,
                                existingPvc?.metadata.name,
                              ),
                            ),
                          },
                          existingPvc: connectedNotebooks.some(
                            (n) => n.metadata.name === notebookName,
                          ),
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

              {restartNotebooks.length !== 0 && (
                <StackItem>
                  <NotebookRestartAlert notebooks={restartNotebooks} />
                </StackItem>
              )}
            </Stack>
          </FormGroup>
        )}
      </>
    </BaseStorageModal>
  );
};

export default ClusterStorageModal;
