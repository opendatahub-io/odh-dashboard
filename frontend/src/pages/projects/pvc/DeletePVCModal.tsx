import * as React from 'react';
import { Alert, Button, Modal, Stack, StackItem } from '@patternfly/react-core';
import { getPvcDisplayName } from '../utils';
import { PersistentVolumeClaimKind } from '../../../k8sTypes';
import { deletePvc } from '../../../api';

type DeleteStorageProps = {
  pvcToDelete?: PersistentVolumeClaimKind;
  onClose: (deleted: boolean) => void;
};

const DeletePVCModal: React.FC<DeleteStorageProps> = ({ pvcToDelete, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  return (
    <Modal
      title="Confirm storage delete"
      variant="small"
      isOpen={!!pvcToDelete}
      onClose={() => onClose(false)}
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
                  onClose(true);
                })
                .catch((e) => {
                  setError(e);
                });
            }
          }}
        >
          Delete storage
        </Button>,
        <Button key="cancel" variant="secondary" onClick={() => onClose(false)}>
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
