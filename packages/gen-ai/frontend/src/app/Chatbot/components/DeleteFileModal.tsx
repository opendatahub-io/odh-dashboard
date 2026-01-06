import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { FileModel } from '~/app/types';

interface DeleteFileModalProps {
  isOpen: boolean;
  file: FileModel | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

const DeleteFileModal: React.FC<DeleteFileModalProps> = ({
  isOpen,
  file,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  if (!file) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="small" data-testid="delete-file-modal">
      <ModalHeader title="Delete file?" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            The <strong>{file.filename}</strong> file will be deleted.
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          key="delete-button"
          variant="danger"
          isLoading={isDeleting}
          isDisabled={isDeleting}
          onClick={() => {
            fireMiscTrackingEvent('Playground Delete File Modal Action', {
              action: 'confirmed',
              fileName: file.filename,
            });
            onConfirm();
          }}
        >
          Delete
        </Button>
        <Button
          key="cancel-button"
          variant="link"
          onClick={() => {
            fireMiscTrackingEvent('Playground Delete File Modal Action', {
              action: 'canceled',
              fileName: file.filename,
            });
            onClose();
          }}
          isDisabled={isDeleting}
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeleteFileModal;
