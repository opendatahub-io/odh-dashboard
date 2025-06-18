import * as React from 'react';
import { Button, Stack, FormGroup, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { isEqual } from 'lodash-es';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { StorageData } from '#~/pages/projects/types';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import {
  ConnectedNotebookContext,
  useRelatedNotebooks,
} from '#~/pages/projects/notebook/useRelatedNotebooks';
import useWillNotebooksRestart from '#~/pages/projects/notebook/useWillNotebooksRestart';
import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';
import NotebookRestartAlert from '#~/pages/projects/components/NotebookRestartAlert';
import { useCreateStorageObject } from '#~/pages/projects/screens/spawner/storage/utils';
import BaseStorageModal from './BaseStorageModal';
import {
  handleNotebooksChanges,
  getInUseMountPaths,
  validateClusterMountPath,
  getDefaultMountPathFromStorageName,
  hasAllValidNotebookRelationship,
} from './utils';
import useClusterStorageFormState from './useClusterStorageFormState';
import ClusterStorageTable from './ClusterStorageTable';
import { handleSubmit } from './submitUtils';

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
  const { notebookData, setNotebookData } = useClusterStorageFormState(
    connectedNotebooks,
    existingPvc,
  );
  const [newRowId, setNewRowId] = React.useState<number>(1);
  const isValid = React.useMemo(
    () => hasAllValidNotebookRelationship(notebookData),
    [notebookData],
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
  }, [newRowId, notebookData, setNotebookData, storageName]);

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
    [allNotebooks, existingPvc?.metadata.name, notebookData, setNotebookData],
  );

  const notebookChangesResult = handleNotebooksChanges(notebookData, connectedNotebooks);

  const restartNotebooks = useWillNotebooksRestart([
    ...notebookChangesResult.updatedNotebooks.map((updatedNotebook) => updatedNotebook.name),
    ...notebookChangesResult.removedNotebooks,
    ...notebookChangesResult.newNotebooks.map((newNotebook) => newNotebook.name),
  ]);

  const submit = React.useCallback(
    async (dataSubmit: StorageData) =>
      handleSubmit(
        dataSubmit,
        restartNotebooks,
        notebookChangesResult,
        namespace,
        existingPvc,
        true,
      ).then(() =>
        handleSubmit(
          dataSubmit,
          restartNotebooks,
          notebookChangesResult,
          namespace,
          existingPvc,
          false,
        ),
      ),
    [existingPvc, namespace, notebookChangesResult, restartNotebooks],
  );

  return (
    <BaseStorageModal
      onSubmit={(dataSubmit) => submit(dataSubmit)}
      title={existingPvc ? 'Update cluster storage' : 'Add cluster storage'}
      submitLabel={existingPvc ? 'Update storage' : 'Add storage'}
      description={
        existingPvc
          ? 'Make changes to cluster storage, or connect it to additional workspaces.'
          : 'Add storage and optionally connect it with an existing workbench.'
      }
      onNameChange={(currentName) => {
        setStorageName(currentName);
        updatePathWithNameChange(currentName);
      }}
      isValid={isValid}
      onClose={(submitted) => onClose(submitted)}
      existingPvc={existingPvc}
    >
      <>
        {workbenchEnabled && (
          <FormGroup label="Workbench connections" fieldId="workbench-connections">
            <Stack hasGutter>
              <StackItem>
                <ClusterStorageTable
                  notebookData={notebookData}
                  allNotebooks={allNotebooks}
                  setNotebookData={setNotebookData}
                  notebookLoaded={loaded}
                  connectedNotebooks={connectedNotebooks}
                  existingPvc={existingPvc}
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
                  Add workbench
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
