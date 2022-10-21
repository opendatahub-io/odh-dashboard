import * as React from 'react';
import { Alert, Button, Modal, Stack, StackItem } from '@patternfly/react-core';
import { getPvcDisplayName } from '../utils';
import { PersistentVolumeClaimKind } from '../../../k8sTypes';
import { deletePvc } from '../../../api';

type DeletePVCModalProps = {
  pvcToDelete?: PersistentVolumeClaimKind;
  onClose: (deleted: boolean) => void;
};

const DeletePVCModal: React.FC<DeletePVCModalProps> = ({ pvcToDelete, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  return (
    <Modal
      title="Confirm storage delete"
      variant="small"
      isOpen={!!pvcToDelete}
      onClose={() => onBeforeClose(false)}
      actions={[
        <Button
          key="delete-storage"
          variant="danger"
          isDisabled={isDeleting}
          onClick={() => {
            if (pvcToDelete) {
              const { name, namespace } = pvcToDelete.metadata;

              setIsDeleting(true);
              deletePvc(name, namespace)
                .then(() => {
                  onBeforeClose(true);
                })
                .catch((e) => {
                  setError(e);
                  setIsDeleting(false);
                });
            }
          }}
        >
          Delete storage
        </Button>,
        <Button key="cancel" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
    >
      <Stack hasGutter>
        <StackItem>
          Are you sure you want to delete{' '}
          {pvcToDelete ? (
            <strong>{getPvcDisplayName(pvcToDelete)}</strong>
          ) : (
            'this persistent storage'
          )}
          ?
        </StackItem>
        {error && (
          <StackItem>
            <Alert title="Error deleting storage" isInline variant="danger">
              {error.message}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};

export default DeletePVCModal;
