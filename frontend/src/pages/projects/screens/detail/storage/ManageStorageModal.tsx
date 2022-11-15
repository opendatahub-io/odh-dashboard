import * as React from 'react';
import { Alert, Button, Form, Modal, Stack, StackItem } from '@patternfly/react-core';
import {
  assemblePvc,
  attachNotebookPVC,
  createPvc,
  removeNotebookPVC,
  updatePvcDescription,
  updatePvcDisplayName,
} from '../../../../../api';
import { NotebookKind, PersistentVolumeClaimKind } from '../../../../../k8sTypes';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import { useCreateStorageObjectForNotebook } from '../../spawner/storage/utils';
import CreateNewStorageSection from '../../spawner/storage/CreateNewStorageSection';
import ConnectExistingNotebook from './ConnectExistingNotebook';
import ExistingConnectedNotebooks from './ExistingConnectedNotebooks';
import useRelatedNotebooks, {
  ConnectedNotebookContext,
} from '../../../notebook/useRelatedNotebooks';
import { getPvcDescription, getPvcDisplayName } from '../../../utils';

import './ManageStorageModal.scss';

type AddStorageModalProps = {
  existingData?: PersistentVolumeClaimKind;
  isOpen: boolean;
  onClose: (submit: boolean) => void;
};

const ManageStorageModal: React.FC<AddStorageModalProps> = ({ existingData, isOpen, onClose }) => {
  const [createData, setCreateData, resetData] = useCreateStorageObjectForNotebook(existingData);
  const [actionInProgress, setActionInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error | undefined>();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;
  const {
    notebooks: connectedNotebooks,
    loaded: notebookLoaded,
    error: notebookError,
  } = useRelatedNotebooks(ConnectedNotebookContext.PVC, existingData?.metadata.name);
  const [removedNotebooks, setRemovedNotebooks] = React.useState<string[]>([]);

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setActionInProgress(false);
    setRemovedNotebooks([]);
    resetData();
  };

  const hasValidNotebookRelationship = createData.forNotebook.name
    ? !!createData.forNotebook.mountPath.value && !createData.forNotebook.mountPath.error
    : true;
  const canCreate = !actionInProgress && createData.nameDesc.name && hasValidNotebookRelationship;

  const submit = async () => {
    setError(undefined);
    setActionInProgress(true);

    const {
      nameDesc: { name, description },
      size,
      forNotebook: { name: notebookName, mountPath },
    } = createData;

    const pvc = assemblePvc(name, namespace, description, size);

    const handleError = (e: Error) => {
      setError(e);
      setActionInProgress(false);
    };
    const handleNotebookNameConnection = (pvcName: string) => {
      if (notebookName) {
        attachNotebookPVC(notebookName, namespace, pvcName, mountPath.value)
          .then(() => {
            setActionInProgress(false);
            onBeforeClose(true);
          })
          .catch((e) => {
            setError(e);
            setActionInProgress(false);
          });
      } else {
        setActionInProgress(false);
        onBeforeClose(true);
      }
    };

    if (existingData) {
      const pvcName = existingData.metadata.name;
      if (getPvcDisplayName(existingData) !== createData.nameDesc.name) {
        await updatePvcDisplayName(pvcName, namespace, createData.nameDesc.name);
      }
      if (getPvcDescription(existingData) !== createData.nameDesc.description) {
        await updatePvcDescription(pvcName, namespace, createData.nameDesc.description);
      }
      if (removedNotebooks.length > 0) {
        // Remove connected pvcs
        Promise.all(
          removedNotebooks.map((notebookName) =>
            removeNotebookPVC(notebookName, namespace, pvcName),
          ),
        )
          .then(() => handleNotebookNameConnection(pvcName))
          .catch(handleError);
        return;
      }
      handleNotebookNameConnection(pvcName);
    } else {
      createPvc(pvc)
        .then((createdPvc) => handleNotebookNameConnection(createdPvc.metadata.name))
        .catch(handleError);
    }
  };

  return (
    <Modal
      title={existingData ? 'Edit storage' : 'Add storage'}
      description={
        existingData
          ? 'Edit storage and optionally connect it to another existing workbench.'
          : 'Add a storage and optionally connect it with an existing workbench.'
      }
      variant="medium"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      showClose
      actions={[
        <Button key="submit-storage" variant="primary" isDisabled={!canCreate} onClick={submit}>
          {existingData ? 'Update' : 'Add'} storage
        </Button>,
        <Button key="cancel-storage" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
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
              disableSize={!!existingData}
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
            <ConnectExistingNotebook
              setForNotebookData={(forNotebookData) => {
                setCreateData('forNotebook', forNotebookData);
              }}
              forNotebookData={createData.forNotebook}
              isDisabled={connectedNotebooks.length !== 0 && removedNotebooks.length === 0}
            />
          </Form>
        </StackItem>
        {error && (
          <StackItem>
            <Alert isInline variant="danger" title="Error creating storage">
              {error.message}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};

export default ManageStorageModal;
