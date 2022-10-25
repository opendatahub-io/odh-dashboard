import * as React from 'react';
import { Alert, Button, Form, Modal } from '@patternfly/react-core';
import * as _ from 'lodash';
import {
  assemblePvc,
  attachNotebookPVC,
  createPvc,
  patchPvcChanges,
  removeNotebookPVC,
} from '../../../../../api';
import { PersistentVolumeClaimKind } from '../../../../../k8sTypes';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import {
  getRelatedNotebooksArray,
  useCreateStorageObjectForNotebook,
} from '../../spawner/storage/utils';
import CreateNewStorageSection from '../../spawner/storage/CreateNewStorageSection';
import ConnectExistingWorkspace from './ConnectExistingWorkspace';
import ExistingConnectedNotebooks from './ExistingConnectedNotebooks';

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

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setActionInProgress(false);
    resetData();
  };

  const hasValidNotebookRelationship = createData.forNotebook.name
    ? !!createData.forNotebook.mountPath.value && !createData.forNotebook.mountPath.error
    : true;
  const canCreate = !actionInProgress && createData.nameDesc.name && hasValidNotebookRelationship;

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    const {
      nameDesc: { name, description },
      size,
      forNotebook: { name: notebookName, mountPath },
      existingNotebooks,
    } = createData;
    const notebookNames: string[] = [];
    if (notebookName) {
      notebookNames.push(notebookName);
    }
    if (existingNotebooks.length > 0) {
      notebookNames.push(...existingNotebooks);
    }

    const pvc = assemblePvc(name, namespace, description, size, notebookNames);

    const handleError = (e: Error) => {
      setError(e);
      setActionInProgress(false);
    };
    const handleNotebookNameConnection = () => {
      if (notebookName) {
        attachNotebookPVC(notebookName, namespace, pvc.metadata.name, mountPath.value)
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
      const pvcAnnotations = pvc.metadata.annotations;
      const existingAnnotations = existingData.metadata.annotations;
      const annotations = _.isEqual(pvcAnnotations, existingAnnotations)
        ? undefined
        : pvcAnnotations;
      const removedConnectedNotebooks = _.difference<string>(
        getRelatedNotebooksArray(
          existingData.metadata.annotations?.['opendatahub.io/related-notebooks'] || '',
        ),
        existingNotebooks,
      );
      patchPvcChanges(existingData.metadata.name, existingData.metadata.namespace, annotations)
        .then(() => {
          if (removedConnectedNotebooks.length > 0) {
            // Remove connected pvcs
            Promise.all(
              removedConnectedNotebooks.map((notebookName) =>
                removeNotebookPVC(notebookName, namespace, existingData.metadata.name),
              ),
            )
              .then(handleNotebookNameConnection)
              .catch(handleError);
            return;
          }
          handleNotebookNameConnection();
        })
        .catch(handleError);
    } else {
      createPvc(pvc).then(handleNotebookNameConnection).catch(handleError);
    }
  };

  return (
    <Modal
      title={existingData ? 'Edit storage' : 'Add storage'}
      description={
        existingData
          ? 'Edit storage and optionally connect it to another existing workspace.'
          : 'Add a storage and optionally connect it with an existing workspace.'
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
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <CreateNewStorageSection
          availableSize={20}
          data={createData}
          setData={(key, value) => setCreateData(key, value)}
          disableSize={!!existingData}
        />
        {createData.hasExistingNotebookConnections && (
          <ExistingConnectedNotebooks
            existingNotebooks={createData.existingNotebooks}
            setExistingNotebooks={(newExistingNotebooks) =>
              setCreateData('existingNotebooks', newExistingNotebooks)
            }
          />
        )}
        <ConnectExistingWorkspace
          setForNotebookData={(forNotebookData) => {
            setCreateData('forNotebook', forNotebookData);
          }}
          forNotebookData={createData.forNotebook}
        />
      </Form>
      {error && (
        <Alert isInline variant="danger" title="Error creating storage">
          {error.message}
        </Alert>
      )}
    </Modal>
  );
};

export default ManageStorageModal;
